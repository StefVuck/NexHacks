"""FastAPI backend for Swarm Architect.

Provides REST API and WebSocket endpoints for frontend integration.
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from api.routes import build, simulate, deploy, design, woodwide
from api.websocket import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("🚀 Swarm Architect API starting...")
    print("📊 Woodwide CSV service initialized")
    yield
    # Shutdown
    print("👋 Swarm Architect API shutting down...")


app = FastAPI(
    title="Swarm Architect API",
    description="Natural language to distributed embedded systems",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite/Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(design.router, prefix="/api/design", tags=["design"])
app.include_router(build.router, prefix="/api/build", tags=["build"])
app.include_router(simulate.router, prefix="/api/simulate", tags=["simulate"])
app.include_router(deploy.router, prefix="/api/deploy", tags=["deploy"])
app.include_router(woodwide.router)  # Woodwide CSV service
app.include_router(ws_router, tags=["websocket"])


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Swarm Architect API",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "components": {
            "api": "ok",
            "llm": "ok",  # Could check ANTHROPIC_API_KEY
            "qemu": "ok",  # Could check qemu-system-arm availability
        },
    }
