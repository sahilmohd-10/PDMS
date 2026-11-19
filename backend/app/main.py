"""
HIRS - Hardware Intelligence & Recommendation System Backend Entry Point
FastAPI application with CORS, request logging, and OpenAPI documentation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time

from app.api.routes import router
from app.api.evaluation_routes import router as evaluation_router

app = FastAPI(
    title="HIRS API — Hardware Intelligence & Recommendation System",
    description="Production-grade AI hardware intelligence platform for BUY/NOT BUY prediction and budget-based recommendations.",
    version="1.0.0"
)

# Enable CORS for local development and production frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the API router
app.include_router(router)
app.include_router(evaluation_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "HIRS Backend"
    }

@app.get("/")
def root():
    return {
        "name": "HIRS API",
        "description": "Hardware Intelligence & Recommendation System API",
        "docs_url": "/docs",
        "health_check": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
