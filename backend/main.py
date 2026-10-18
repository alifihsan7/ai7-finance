import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine, Base
import app.models.transaction
import app.models.subscription
import app.models.account

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for local dev / frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Serve Frontend static files if present
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
INDEX_PATH = os.path.join(STATIC_DIR, "index.html")
NEXT_DIR = os.path.join(STATIC_DIR, "_next")

if os.path.exists(NEXT_DIR):
    app.mount("/_next", StaticFiles(directory=NEXT_DIR), name="next_static")

@app.get("/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}

if os.path.exists(INDEX_PATH):
    @app.get("/")
    def root():
        return FileResponse(INDEX_PATH)

if os.path.exists(STATIC_DIR):
    @app.get("/{file_name:path}")
    def serve_static(file_name: str):
        target_path = os.path.join(STATIC_DIR, file_name)
        if os.path.isfile(target_path):
            return FileResponse(target_path)
        if os.path.exists(INDEX_PATH):
            return FileResponse(INDEX_PATH)
        return JSONResponse({"detail": "Not Found"}, status_code=404)
