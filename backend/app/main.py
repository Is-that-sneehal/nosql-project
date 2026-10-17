"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.mongodb import connect_mongodb, close_mongodb
from app.db.redis import connect_redis, close_redis
from app.routers import auth, admin, books, articles


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown of database connections."""
    # Startup
    await connect_mongodb()
    await connect_redis()
    yield
    # Shutdown
    await close_mongodb()
    await close_redis()


app = FastAPI(
    title="Library Management System",
    description="A full-stack library management system with book translation and article summarization.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(books.router)
app.include_router(articles.router)


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Library Management System API"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
