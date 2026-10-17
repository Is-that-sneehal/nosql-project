"""
Simple Library Management System with Book Translation, Article Summarization & Book TTS
- Python 3.10+, Flask, Jinja2
- PyMongo (synchronous)
- Redis (synchronous)
- Flask-Login with session cookies & Werkzeug password hashing
- pyttsx3 / Windows SAPI5 for offline text-to-speech (books only)
"""

import os
import re
import time
from functools import wraps
from bson import ObjectId
from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    abort,
)
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    logout_user,
    login_required,
    current_user,
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Translation & Summarization libraries
from deep_translator import MyMemoryTranslator
from deep_translator.exceptions import TooManyRequests
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer

# Text-to-Speech (offline, Windows SAPI5)
import pyttsx3
try:
    import pythoncom
    _PYTHONCOM_AVAILABLE = True
except ImportError:
    _PYTHONCOM_AVAILABLE = False

# MyMemory Translation Configuration
TRANSLATOR_EMAIL = os.getenv("TRANSLATOR_EMAIL", "library.aetheria.app@gmail.com")
MYMEMORY_LANG_MAP = {
    "hi": "hi-IN",
    "te": "te-IN",
    "en": "en-GB",
    "auto": "en-GB",
    "hindi": "hi-IN",
    "telugu": "te-IN",
    "english": "en-GB",
}

from database import (
    users_col,
    books_col,
    articles_col,
    redis_client,
)

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "simple-library-secret-key-12345")

# Supported regional languages
LANGUAGES = {
    "hi": "Hindi",
    "te": "Telugu",
}

# ---------------------------------------------------------------------------
# Flask-Login Configuration
# ---------------------------------------------------------------------------

login_manager = LoginManager()
login_manager.login_view = "login"
login_manager.login_message = "Please sign in to access this page."
login_manager.login_message_category = "info"
login_manager.init_app(app)


class User(UserMixin):
    """User object for Flask-Login session management."""

    def __init__(self, user_doc):
        self.id = str(user_doc["_id"])
        self.name = user_doc.get("name", "")
        self.email = user_doc.get("email", "")
        self.role = user_doc.get("role", "member")

    @property
    def is_admin(self):
        return self.role == "admin"


@login_manager.user_loader
def load_user(user_id):
    try:
        doc = users_col.find_one({"_id": ObjectId(user_id)})
        if doc:
            return User(doc)
    except Exception:
        pass
    return None


def admin_required(f):
    """Decorator to enforce admin role access."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please sign in first.", "danger")
            return redirect(url_for("login"))
        if current_user.role != "admin":
            flash("Access denied. Admin privileges required.", "danger")
            return redirect(url_for("member_books"))
        return f(*args, **kwargs)
    return decorated_function


# ---------------------------------------------------------------------------
# Helper NLP / Translation Functions
# ---------------------------------------------------------------------------

def chunk_text(text, max_chars=450):
    """Split text into sentence/paragraph-sized chunks of at most max_chars (~450 chars).

    Splits on paragraph boundaries first, then sentences, and falls back to
    character slices if a single sentence exceeds max_chars, to strictly satisfy
    MyMemory's 500-character limit.
    """
    paragraphs = re.split(r"\n\s*\n", text)
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(para) > max_chars:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                if len(sentence) > max_chars:
                    for i in range(0, len(sentence), max_chars):
                        sub = sentence[i:i + max_chars].strip()
                        if sub:
                            if current_chunk:
                                chunks.append(current_chunk)
                                current_chunk = ""
                            chunks.append(sub)
                elif len(current_chunk) + len(sentence) + 1 <= max_chars:
                    current_chunk = (current_chunk + " " + sentence).strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = sentence
        elif len(current_chunk) + len(para) + 2 <= max_chars:
            current_chunk = (current_chunk + "\n\n" + para).strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [text[:max_chars]]


def translate_text(text, target_lang, redis_client, cache_key):
    """Translate book text with MyMemoryTranslator, caching, throttling, and retry.

    1. Check Redis for cached translation first; return immediately on hit.
    2. Split content into <= 450 character chunks to respect MyMemory limits.
    3. Sleep 0.3s between chunk requests.
    4. Retry up to 3 times per chunk with 5s sleep on rate limit errors.
    5. Cache joined result in Redis with 86400s (1-day) expiry.
    """
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return cached if isinstance(cached, str) else cached.decode()
        except Exception as e:
            print(f"Redis get error: {e}")

    target = MYMEMORY_LANG_MAP.get(target_lang.lower(), target_lang)
    source = "en-GB"

    chunks = chunk_text(text, max_chars=450)
    translated_parts = []

    for idx, chunk in enumerate(chunks):
        translated = None
        for attempt in range(3):
            try:
                translator = MyMemoryTranslator(
                    source=source,
                    target=target,
                    email=TRANSLATOR_EMAIL
                )
                translated = translator.translate(chunk)
                break
            except Exception as e:
                if (isinstance(e, TooManyRequests) or "too many requests" in str(e).lower()) and attempt < 2:
                    time.sleep(5)
                else:
                    raise

        translated_parts.append(translated or "")

        if idx < len(chunks) - 1:
            time.sleep(0.3)

    result = "\n\n".join(translated_parts)

    if redis_client:
        try:
            redis_client.setex(cache_key, 86400, result)
        except Exception as e:
            print(f"Redis setex error: {e}")

    return result


def summarize_text(text, sentence_count=4):
    """Extractive summarization using sumy's TextRank."""
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = TextRankSummarizer()
    summary_sentences = summarizer(parser.document, sentences_count=sentence_count)
    return " ".join(str(s) for s in summary_sentences)


# ---------------------------------------------------------------------------
# Audio (TTS) Helper
# ---------------------------------------------------------------------------

AUDIO_DIR = os.path.join("static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)


def get_or_generate_audio(book_id, text):
    """Return the path to book_{book_id}.wav, generating it with pyttsx3 if needed.

    Uses a simple file-existence check as the cache strategy — no Redis.
    Calls pythoncom.CoInitialize() before pyttsx3.init() to avoid COM threading
    errors when Flask runs in multi-threaded mode (common on Windows/SAPI5).
    """
    filepath = os.path.join(AUDIO_DIR, f"book_{book_id}.wav")
    if os.path.exists(filepath):
        return filepath

    if _PYTHONCOM_AVAILABLE:
        pythoncom.CoInitialize()

    engine = pyttsx3.init()
    engine.save_to_file(text, filepath)
    engine.runAndWait()
    engine.stop()
    return filepath


# ---------------------------------------------------------------------------
# Root & Auth Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    if not current_user.is_authenticated:
        return redirect(url_for("login"))
    if current_user.role == "admin":
        return redirect(url_for("admin_books"))
    return redirect(url_for("member_books"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        user_doc = users_col.find_one({"email": email})
        if user_doc and check_password_hash(user_doc.get("password_hash", ""), password):
            user = User(user_doc)
            login_user(user)
            flash(f"Welcome back, {user.name}!", "success")
            if user.role == "admin":
                return redirect(url_for("admin_books"))
            return redirect(url_for("member_books"))
        else:
            flash("Invalid email or password. Please try again.", "danger")

    return render_template("auth/login.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        role = request.form.get("role", "member")

        if not name or not email or not password:
            flash("All fields are required.", "danger")
            return render_template("auth/register.html")

        if users_col.find_one({"email": email}):
            flash("An account with this email already exists.", "danger")
            return render_template("auth/register.html")

        user_doc = {
            "name": name,
            "email": email,
            "password_hash": generate_password_hash(password),
            "role": "admin" if role == "admin" else "member",
        }
        res = users_col.insert_one(user_doc)
        user_doc["_id"] = res.inserted_id

        user = User(user_doc)
        login_user(user)
        flash("Registration successful! Welcome to Aetheria Library.", "success")
        if user.role == "admin":
            return redirect(url_for("admin_books"))
        return redirect(url_for("member_books"))

    return render_template("auth/register.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been signed out.", "info")
    return redirect(url_for("login"))


# ---------------------------------------------------------------------------
# Admin Routes (CRUD for Books & Articles, Members List)
# ---------------------------------------------------------------------------

@app.route("/admin/books", methods=["GET", "POST"])
@admin_required
def admin_books():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        author = request.form.get("author", "").strip()
        genre = request.form.get("genre", "").strip()
        cover_url = request.form.get("cover_url", "").strip()
        content_text = request.form.get("content_text", "").strip()

        if not title or not author or not content_text:
            flash("Title, author, and content text are required.", "danger")
        else:
            books_col.insert_one({
                "title": title,
                "author": author,
                "genre": genre,
                "cover_url": cover_url,
                "content_text": content_text,
                "uploaded_by": current_user.id,
            })
            flash(f"Book '{title}' added successfully!", "success")
            return redirect(url_for("admin_books"))

    books = list(books_col.find().sort("_id", -1))
    return render_template("admin/books.html", books=books)


@app.route("/admin/books/<book_id>/edit", methods=["GET", "POST"])
@admin_required
def admin_edit_book(book_id):
    try:
        book = books_col.find_one({"_id": ObjectId(book_id)})
    except Exception:
        book = None

    if not book:
        flash("Book not found.", "danger")
        return redirect(url_for("admin_books"))

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        author = request.form.get("author", "").strip()
        genre = request.form.get("genre", "").strip()
        cover_url = request.form.get("cover_url", "").strip()
        content_text = request.form.get("content_text", "").strip()

        if not title or not author or not content_text:
            flash("Title, author, and content text are required.", "danger")
        else:
            books_col.update_one(
                {"_id": ObjectId(book_id)},
                {"$set": {
                    "title": title,
                    "author": author,
                    "genre": genre,
                    "cover_url": cover_url,
                    "content_text": content_text,
                }},
            )
            # Invalidate Redis translation cache for this book
            try:
                for lang in LANGUAGES.keys():
                    redis_client.delete(f"translate:{book_id}:{lang}")
            except Exception as e:
                print(f"Redis cache delete warning: {e}")

            # Also delete cached audio file if content changed
            audio_path = os.path.join(AUDIO_DIR, f"book_{book_id}.wav")
            if os.path.exists(audio_path):
                try:
                    os.remove(audio_path)
                except Exception as e:
                    print(f"Audio cache cleanup error: {e}")

            flash(f"Book '{title}' updated successfully!", "success")
            return redirect(url_for("admin_books"))

    return render_template("admin/edit_book.html", book=book)


@app.route("/admin/books/<book_id>/delete", methods=["POST"])
@admin_required
def admin_delete_book(book_id):
    try:
        books_col.delete_one({"_id": ObjectId(book_id)})
        # Invalidate Redis cache
        for lang in LANGUAGES.keys():
            redis_client.delete(f"translate:{book_id}:{lang}")
        # Invalidate audio cache
        audio_path = os.path.join(AUDIO_DIR, f"book_{book_id}.wav")
        if os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except Exception:
                pass
        flash("Book deleted successfully.", "success")
    except Exception as e:
        flash(f"Failed to delete book: {e}", "danger")
    return redirect(url_for("admin_books"))


@app.route("/admin/articles", methods=["GET", "POST"])
@admin_required
def admin_articles():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        source = request.form.get("source", "").strip()
        content_text = request.form.get("content_text", "").strip()

        if not title or not content_text:
            flash("Title and content text are required.", "danger")
        else:
            articles_col.insert_one({
                "title": title,
                "source": source,
                "content_text": content_text,
                "uploaded_by": current_user.id,
            })
            flash(f"Article '{title}' published successfully!", "success")
            return redirect(url_for("admin_articles"))

    articles = list(articles_col.find().sort("_id", -1))
    return render_template("admin/articles.html", articles=articles)


@app.route("/admin/articles/<article_id>/edit", methods=["GET", "POST"])
@admin_required
def admin_edit_article(article_id):
    try:
        article = articles_col.find_one({"_id": ObjectId(article_id)})
    except Exception:
        article = None

    if not article:
        flash("Article not found.", "danger")
        return redirect(url_for("admin_articles"))

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        source = request.form.get("source", "").strip()
        content_text = request.form.get("content_text", "").strip()

        if not title or not content_text:
            flash("Title and content text are required.", "danger")
        else:
            articles_col.update_one(
                {"_id": ObjectId(article_id)},
                {"$set": {
                    "title": title,
                    "source": source,
                    "content_text": content_text,
                }},
            )
            # Invalidate Redis summary cache
            try:
                redis_client.delete(f"summary:{article_id}")
            except Exception as e:
                print(f"Redis cache delete warning: {e}")

            flash(f"Article '{title}' updated successfully!", "success")
            return redirect(url_for("admin_articles"))

    return render_template("admin/edit_article.html", article=article)


@app.route("/admin/articles/<article_id>/delete", methods=["POST"])
@admin_required
def admin_delete_article(article_id):
    try:
        articles_col.delete_one({"_id": ObjectId(article_id)})
        redis_client.delete(f"summary:{article_id}")
        flash("Article deleted successfully.", "success")
    except Exception as e:
        flash(f"Failed to delete article: {e}", "danger")
    return redirect(url_for("admin_articles"))


@app.route("/admin/members")
@admin_required
def admin_members():
    members = list(users_col.find({"role": "member"}).sort("_id", -1))
    return render_template("admin/members.html", members=members)


# ---------------------------------------------------------------------------
# Member Routes (Browse, Search, Translate, Summarize)
# ---------------------------------------------------------------------------

@app.route("/books")
@login_required
def member_books():
    query = request.args.get("q", "").strip()
    if query:
        regex = re.compile(re.escape(query), re.IGNORECASE)
        books = list(books_col.find({
            "$or": [
                {"title": regex},
                {"author": regex},
                {"genre": regex},
            ]
        }).sort("_id", -1))
    else:
        books = list(books_col.find().sort("_id", -1))

    return render_template("member/books.html", books=books, query=query)


@app.route("/books/<book_id>")
@login_required
def member_book_detail(book_id):
    try:
        book = books_col.find_one({"_id": ObjectId(book_id)})
    except Exception:
        book = None

    if not book:
        flash("Book not found.", "danger")
        return redirect(url_for("member_books"))

    # Check whether audio has already been generated for this book
    audio_ready = os.path.exists(os.path.join(AUDIO_DIR, f"book_{book_id}.wav"))

    return render_template(
        "member/book_detail.html",
        book=book,
        languages=LANGUAGES,
        selected_lang="hi",
        translated_text=None,
        is_cached=False,
        audio_ready=audio_ready,
    )


@app.route("/books/<book_id>/translate", methods=["POST"])
@login_required
def member_translate_book(book_id):
    if current_user.role == "admin":
        flash("Admins do not have access to member translation features.", "warning")
        return redirect(url_for("admin_books"))

    try:
        book = books_col.find_one({"_id": ObjectId(book_id)})
    except Exception:
        book = None

    if not book:
        flash("Book not found.", "danger")
        return redirect(url_for("member_books"))

    target_lang = request.form.get("lang", "hi")
    if target_lang not in LANGUAGES:
        flash("Unsupported language selected.", "danger")
        return redirect(url_for("member_book_detail", book_id=book_id))

    cache_key = f"translate:{book_id}:{target_lang}"
    is_cached = False
    try:
        if redis_client and redis_client.get(cache_key):
            is_cached = True
    except Exception:
        pass

    try:
        translated_text = translate_text(
            book["content_text"],
            target_lang,
            redis_client,
            cache_key
        )
    except Exception as e:
        err_msg = str(e)
        if isinstance(e, TooManyRequests) or "too many requests" in err_msg.lower():
            flash("Translation service is currently busy. Please wait a few moments and try again.", "warning")
        else:
            flash(f"Translation service encountered an error: {err_msg}", "danger")
        return redirect(url_for("member_book_detail", book_id=book_id))

    audio_ready = os.path.exists(os.path.join(AUDIO_DIR, f"book_{book_id}.wav"))

    return render_template(
        "member/book_detail.html",
        book=book,
        languages=LANGUAGES,
        selected_lang=target_lang,
        translated_text=translated_text,
        is_cached=is_cached,
        audio_ready=audio_ready,
    )


@app.route("/books/<book_id>/audio")
@login_required
def member_book_audio(book_id):
    """Generate (once) and serve the audio page for a book.

    Restricted to members — books only, English content_text only.
    Audio file is cached on disk at static/audio/book_<id>.wav.
    """
    if current_user.role == "admin":
        flash("Admins do not have access to the member Listen feature.", "warning")
        return redirect(url_for("admin_books"))

    try:
        book = books_col.find_one({"_id": ObjectId(book_id)})
    except Exception:
        book = None

    if not book:
        flash("Book not found.", "danger")
        return redirect(url_for("member_books"))

    try:
        get_or_generate_audio(book_id, book["content_text"])
        audio_ready = True
    except Exception as e:
        print(f"TTS generation error: {e}")
        flash(f"Could not generate audio: {e}", "danger")
        audio_ready = False

    return render_template(
        "member/book_detail.html",
        book=book,
        languages=LANGUAGES,
        selected_lang="hi",
        translated_text=None,
        is_cached=False,
        audio_ready=audio_ready,
    )


@app.route("/articles")
@login_required
def member_articles():
    query = request.args.get("q", "").strip()
    if query:
        regex = re.compile(re.escape(query), re.IGNORECASE)
        articles = list(articles_col.find({
            "$or": [
                {"title": regex},
                {"source": regex},
            ]
        }).sort("_id", -1))
    else:
        articles = list(articles_col.find().sort("_id", -1))

    return render_template("member/articles.html", articles=articles, query=query)


@app.route("/articles/<article_id>")
@login_required
def member_article_detail(article_id):
    try:
        article = articles_col.find_one({"_id": ObjectId(article_id)})
    except Exception:
        article = None

    if not article:
        flash("Article not found.", "danger")
        return redirect(url_for("member_articles"))

    return render_template(
        "member/article_detail.html",
        article=article,
        summary=None,
        is_cached=False,
    )


@app.route("/articles/<article_id>/summarize", methods=["POST"])
@login_required
def member_summarize_article(article_id):
    if current_user.role == "admin":
        flash("Admins do not have access to member summarization features.", "warning")
        return redirect(url_for("admin_articles"))

    try:
        article = articles_col.find_one({"_id": ObjectId(article_id)})
    except Exception:
        article = None

    if not article:
        flash("Article not found.", "danger")
        return redirect(url_for("member_articles"))

    cache_key = f"summary:{article_id}"
    is_cached = False
    summary = None

    # Check Redis cache first
    try:
        cached = redis_client.get(cache_key)
        if cached:
            summary = cached
            is_cached = True
    except Exception as e:
        print(f"Redis get error: {e}")

    # On cache miss: summarize via sumy TextRank
    if not summary:
        try:
            summary = summarize_text(article["content_text"], sentence_count=4)
            # Cache in Redis with 1-day expiry (86400s)
            try:
                redis_client.setex(cache_key, 86400, summary)
            except Exception as e:
                print(f"Redis setex error: {e}")
        except Exception as e:
            flash(f"Summarization error: {str(e)}", "danger")
            return redirect(url_for("member_article_detail", article_id=article_id))

    return render_template(
        "member/article_detail.html",
        article=article,
        summary=summary,
        is_cached=is_cached,
    )


# ---------------------------------------------------------------------------
# Application Runner
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f" * Running Simple Library Management System on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
