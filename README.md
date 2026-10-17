# 📚 Simple Library Management System (Flask + MongoDB + Redis)

A simple, beginner-friendly Library Management System with two roles: **Admin** and **Member**.
- **Admin:** Add/edit/delete books, add/edit/delete articles, and view member directory.
- **Member:** Browse & search books and articles, request on-demand regional **translation** (Hindi & Telugu), and get 4-sentence extractive **summaries** of articles.
- **AI Stack (100% Free, Zero API Keys):** `deep-translator` (Google Translate free endpoint) & `sumy` (TextRank extractive summarization on CPU).
- **Architecture:** Synchronous Flask, Jinja2 templates styled with Tailwind CSS via CDN, PyMongo, Redis caching (`setex` 1-day TTL), and Flask-Login session cookies. No Docker, no async code, no build tooling.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+, Flask
- **Templates:** Jinja2 server-rendered HTML + Tailwind CSS (via CDN)
- **Database:** MongoDB (via `pymongo`)
- **Cache:** Redis (via `redis-py`, 24-hour key-value cache)
- **Auth:** `flask-login` with session cookies & Werkzeug password hashing
- **Translation:** `deep-translator` (chunked translation to Hindi `hi` and Telugu `te`)
- **Summarization:** `sumy` (TextRankSummarizer, 4 sentences)

---

## ⚡ Quick Start

### 1. Install Dependencies
Make sure you have Python 3.10+ installed, then run:
```bash
pip install -r requirements.txt
python -m nltk.downloader punkt punkt_tab
```

### 2. Configure Environment (`.env`)
The project comes with default local configuration in `.env`:
```env
MONGO_URI=mongodb://localhost:27017/library_simple_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=simple-library-secret-key-12345
```
*(If you are using MongoDB Atlas, simply paste your connection URI into `MONGO_URI`)*

### 3. Ensure MongoDB & Redis Are Running
- Start MongoDB: `mongod` (or make sure your MongoDB service is running)
- Start Redis: `redis-server` (or local Redis service)

### 4. Seed Sample Data
Run the seeder script to populate sample books, articles, and accounts:
```bash
python seed.py
```

### 5. Run the Application
```bash
python app.py
```
Open your browser at **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | What They Can Do |
|---|---|---|---|
| **Admin** | `admin@library.com` | `admin123` | Full CRUD for Books & Articles, view member directory |
| **Member** | `member@library.com` | `member123` | Browse catalog, Translate books to `hi`/`te`, Summarize articles |

*(You can also use the one-click demo buttons on the Sign In page to auto-fill credentials)*

---

## 🌐 Regional Translation & Summarization Details

### Translation
- **Languages Supported:**
  - `hi` &rarr; Hindi
  - `te` &rarr; Telugu
- **Chunking:** Texts longer than ~3500 characters are automatically split into paragraph and sentence chunks, translated sequentially via `deep-translator`, and reassembled.
- **Redis Caching:** Stored in `translate:<book_id>:<lang>` with a 1-day TTL (`setex`).
- **Cache Invalidation:** When an admin edits or deletes a book, cached translations for that book in Redis are automatically purged.

### Summarization
- **Algorithm:** `sumy` with `TextRankSummarizer` (extractive graph ranking).
- **Sentences:** Fixed at 4 core sentences.
- **Redis Caching:** Stored in `summary:<article_id>` with a 1-day TTL (`setex`).
- **Cache Invalidation:** When an admin edits or deletes an article, the cached summary in Redis is automatically purged.
