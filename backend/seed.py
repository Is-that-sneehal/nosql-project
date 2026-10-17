"""
Seed script: creates demo admin, demo member, sample books, and sample articles.

Usage:
    python seed.py
"""

import asyncio
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password


DEMO_ADMIN = {
    "name": "Admin User",
    "email": "admin@library.com",
    "password_hash": hash_password("admin123"),
    "role": "admin",
    "created_at": datetime.now(timezone.utc),
}

DEMO_MEMBER = {
    "name": "Member User",
    "email": "member@library.com",
    "password_hash": hash_password("member123"),
    "role": "member",
    "created_at": datetime.now(timezone.utc),
}

SAMPLE_BOOKS = [
    {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "genre": "Fiction",
        "description": "A novel set in the Jazz Age on Long Island, near New York City, about the mysterious millionaire Jay Gatsby and his obsession with the beautiful Daisy Buchanan.",
        "content_text": (
            "In my younger and more vulnerable years my father gave me some advice that I've been "
            "turning over in my mind ever since. 'Whenever you feel like criticizing anyone,' he told me, "
            "'just remember that all the people in this world haven't had the advantages that you've had.'\n\n"
            "He didn't say any more, but we've always been unusually communicative in a reserved way, and I "
            "understood that he meant a great deal more than that. In consequence, I'm inclined to reserve all "
            "judgments, a habit that has opened up many curious natures to me and also made me the victim of not "
            "a few veteran bores.\n\n"
            "The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal "
            "person, and so it came about that in college I was unjustly accused of being a politician, because "
            "I was privy to the secret griefs of wild, unknown men. Most of the confidences were unsought — "
            "frequently I have feigned sleep, preoccupation, or a hostile levity when I realized by some unmistakable "
            "sign that an intimate revelation was quivering on the horizon; for the intimate revelations of young "
            "men, or at least the terms in which they express them, are usually plagiaristic and marred by obvious "
            "suppressions. Reserving judgments is a matter of infinite hope."
        ),
        "cover_url": "https://covers.openlibrary.org/b/id/8432047-L.jpg",
    },
    {
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "genre": "Romance",
        "description": "A romantic novel of manners that follows the character development of Elizabeth Bennet, the dynamic protagonist, who learns about the repercussions of hasty judgments.",
        "content_text": (
            "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be "
            "in want of a wife. However little known the feelings or views of such a man may be on his first entering "
            "a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is "
            "considered as the rightful property of some one or other of their daughters.\n\n"
            "'My dear Mr. Bennet,' said his lady to him one day, 'have you heard that Netherfield Park is let at "
            "last?' Mr. Bennet replied that he had not. 'But it is,' returned she; 'for Mrs. Long has just been here, "
            "and she told me all about it.' Mr. Bennet made no answer. 'Do not you want to know who has taken it?' "
            "cried his wife impatiently. 'You want to tell me, and I have no objection to hearing it.' This was "
            "invitation enough.\n\n"
            "'Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune "
            "from the north of England; that he came down on Monday in a chaise and four to see the place, and was "
            "so much delighted with it that he agreed with Mr. Morris immediately; that he is to take possession "
            "before Michaelmas, and some of his servants are to be in the house by the end of next week.'"
        ),
        "cover_url": "https://covers.openlibrary.org/b/id/8479576-L.jpg",
    },
    {
        "title": "A Brief History of Time",
        "author": "Stephen Hawking",
        "genre": "Science",
        "description": "A landmark volume in science writing exploring the nature of time, the Big Bang, black holes, and the search for a grand unified theory.",
        "content_text": (
            "A well-known scientist once gave a public lecture on astronomy. He described how the earth orbits around "
            "the sun and how the sun, in turn, orbits around the center of a vast collection of stars called our galaxy. "
            "At the end of the lecture, a little old lady at the back of the room got up and said: 'What you have told us "
            "is rubbish. The world is really a flat plate supported on the back of a giant tortoise.' The scientist gave "
            "a superior smile before replying, 'What is the tortoise standing on?' 'You're very clever, young man, very "
            "clever,' said the old lady. 'But it's turtles all the way down!'\n\n"
            "Most people would find the picture of our universe as an infinite tower of tortoises rather ridiculous, but "
            "why do we think we know better? What do we know about the universe, and how do we know it? Where did the "
            "universe come from, and where is it going? Did the universe have a beginning, and if so, what happened "
            "before then? What is the nature of time? Will it ever come to an end?\n\n"
            "Recent breakthroughs in physics, made possible in part by fantastic new technologies, suggest answers to "
            "some of these longstanding questions. Someday these answers may seem as obvious to us as the earth orbiting "
            "the sun — or perhaps as ridiculous as a tower of tortoises. Only time (whatever that may be) will tell."
        ),
        "cover_url": "https://covers.openlibrary.org/b/id/8739161-L.jpg",
    },
]

SAMPLE_ARTICLES = [
    {
        "title": "The Rise of Artificial Intelligence in Modern Healthcare",
        "source": "Nature Medicine",
        "tags": ["AI", "healthcare", "technology", "machine learning"],
        "content_text": (
            "Artificial intelligence is rapidly transforming the healthcare industry, offering unprecedented "
            "opportunities to improve patient outcomes and reduce costs. Machine learning algorithms are now being "
            "used to analyze medical images with accuracy that rivals, and in some cases surpasses, that of human "
            "radiologists. Deep learning models can detect early signs of diseases such as cancer, diabetic "
            "retinopathy, and cardiovascular conditions from imaging data alone.\n\n"
            "Beyond diagnostics, AI is making significant strides in drug discovery and development. Traditional "
            "drug development processes can take over a decade and cost billions of dollars. AI-powered platforms "
            "can analyze vast chemical libraries and predict molecular interactions, potentially reducing the time "
            "and cost of bringing new treatments to market. Several AI-discovered drug candidates have already "
            "entered clinical trials.\n\n"
            "Natural language processing is another area where AI is making an impact in healthcare. Clinical "
            "documentation, which consumes a significant portion of physician time, can be streamlined through "
            "AI-assisted transcription and summarization. Electronic health records can be analyzed to identify "
            "patterns and predict patient deterioration, enabling proactive interventions.\n\n"
            "However, the adoption of AI in healthcare comes with significant challenges. Data privacy concerns, "
            "algorithmic bias, and the need for regulatory frameworks are critical issues that must be addressed. "
            "The 'black box' nature of some AI models raises questions about transparency and accountability in "
            "clinical decision-making. Despite these challenges, the potential benefits of AI in healthcare are "
            "immense, and continued research and responsible implementation will be key to realizing them."
        ),
    },
    {
        "title": "Climate Change and Global Food Security",
        "source": "Science Journal",
        "tags": ["climate", "food security", "environment", "agriculture"],
        "content_text": (
            "Climate change poses one of the most significant threats to global food security in the 21st century. "
            "Rising temperatures, changing precipitation patterns, and increasing frequency of extreme weather events "
            "are already affecting crop yields and livestock productivity around the world. Agricultural systems that "
            "have remained stable for centuries are now facing unprecedented challenges.\n\n"
            "Studies indicate that global crop yields could decline by up to 25 percent by 2050 if current warming "
            "trends continue. Wheat, rice, and maize — staple crops that feed billions — are particularly vulnerable "
            "to heat stress and water scarcity. In tropical regions, where many of the world's poorest communities "
            "rely on subsistence farming, the impacts are expected to be most severe.\n\n"
            "Adaptation strategies are crucial for building resilience in agricultural systems. These include developing "
            "drought-resistant crop varieties, improving irrigation efficiency, implementing conservation agriculture "
            "practices, and diversifying food sources. Technology plays a vital role, with precision agriculture, "
            "satellite monitoring, and data-driven decision tools helping farmers optimize their practices.\n\n"
            "International cooperation is essential for addressing the interconnected challenges of climate change and "
            "food security. The Paris Agreement and the United Nations Sustainable Development Goals provide frameworks "
            "for action, but implementation at the local level remains a significant challenge. Investing in agricultural "
            "research, supporting smallholder farmers, and reducing food waste are critical steps toward ensuring food "
            "security in a changing climate."
        ),
    },
    {
        "title": "The Future of Quantum Computing",
        "source": "MIT Technology Review",
        "tags": ["quantum computing", "technology", "physics", "computing"],
        "content_text": (
            "Quantum computing represents a paradigm shift in computational capability that could revolutionize "
            "fields ranging from cryptography to drug discovery. Unlike classical computers that process information "
            "in binary bits, quantum computers leverage quantum mechanical phenomena such as superposition and "
            "entanglement to perform calculations on quantum bits, or qubits.\n\n"
            "Recent years have seen remarkable progress in quantum hardware development. Major technology companies "
            "and research institutions have built quantum processors with increasing numbers of qubits and improving "
            "error rates. Google's demonstration of quantum supremacy in 2019, where a quantum computer solved a "
            "problem faster than the world's most powerful supercomputer, marked a significant milestone.\n\n"
            "The potential applications of quantum computing are vast. In chemistry and materials science, quantum "
            "simulations could lead to the discovery of new materials and more efficient catalysts. In finance, "
            "quantum algorithms could optimize portfolios and detect fraud more effectively. In artificial intelligence, "
            "quantum machine learning algorithms could process complex datasets more efficiently than classical "
            "approaches.\n\n"
            "Despite the excitement, significant challenges remain before quantum computing becomes practical for "
            "widespread use. Quantum decoherence, error correction, and the need for extremely low temperatures are "
            "technical hurdles that researchers are actively working to overcome. The development of fault-tolerant "
            "quantum computers capable of running complex algorithms remains years away, but the pace of progress "
            "suggests that quantum computing will eventually deliver on its transformative promise."
        ),
    },
]


async def seed():
    """Run the seed process."""
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    # Clear existing data
    await db["users"].delete_many({})
    await db["books"].delete_many({})
    await db["articles"].delete_many({})

    # Create indexes
    await db["users"].create_index("email", unique=True)
    await db["books"].create_index([("title", "text"), ("author", "text"), ("genre", "text")])
    await db["articles"].create_index([("title", "text"), ("tags", "text")])

    # Insert users
    admin_result = await db["users"].insert_one(DEMO_ADMIN)
    member_result = await db["users"].insert_one(DEMO_MEMBER)
    admin_id = str(admin_result.inserted_id)

    print(f"✓ Created admin:  admin@library.com / admin123")
    print(f"✓ Created member: member@library.com / member123")

    # Insert books
    for book in SAMPLE_BOOKS:
        book["uploaded_by"] = admin_id
        book["created_at"] = datetime.now(timezone.utc)
        await db["books"].insert_one(book)
        print(f"✓ Created book: {book['title']}")

    # Insert articles
    for article in SAMPLE_ARTICLES:
        article["uploaded_by"] = admin_id
        article["created_at"] = datetime.now(timezone.utc)
        await db["articles"].insert_one(article)
        print(f"✓ Created article: {article['title']}")

    print("\n🎉 Seed completed successfully!")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
