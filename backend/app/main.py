import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.errors import AppBaseException
from backend.app.core.logging import setup_logging, logger
from backend.app.db.init_db import init_db
from backend.app.api.routes import health, products, visual_search, compatibility, search

# Setup logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.environ.get("TESTING") == "1":
        yield
        return

    # Startup: ensure database tables exist and seed data is available
    logger.info("Starting up Smart Visual Shopping API...")
    try:
        count = init_db()
        logger.info(f"Database ready with {count} catalog products.")
        from backend.app.services.faiss_engine import faiss_engine
        from backend.app.services.clip_service import get_clip_service

        if getattr(settings, "ML_SERVICE_URL", "").lower() in ("local", "internal", "embedded"):
            clip_service = get_clip_service()
            clip_service.load_model()
            logger.info("CLIP model pre-loaded successfully during startup.")

        if faiss_engine.is_ready:
            logger.info(f"FAISS vector index ready with {faiss_engine.index.ntotal} vectors.")
        else:
            logger.warning("FAISS vector index not loaded or empty.")
    except Exception as exc:
        logger.error(f"Error during startup initialization: {exc}")
    yield
    # Shutdown
    logger.info("Shutting down Smart Visual Shopping API...")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Smart Visual Shopping Backend API.\n\n"
        "Features:\n"
        "- Universal natural-language and visual fashion discovery using Marqo FashionCLIP.\n"
        "- Multimodal hybrid search (image + text) with FAISS vector retrieval.\n"
        "- Rich product catalog with verified technical and fashion specifications.\n"
        "- Deterministic, category-specific compatibility rules engine.\n"
        "- Traceable compatibility verdicts with pass/fail evidence."
    ),
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
origins = settings.cors_origins_list
allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_origin_regex=None if allow_all else r"https://.*\.onrender\.com",
    allow_credentials=False if allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception Handlers
@app.exception_handler(AppBaseException)
async def app_base_exception_handler(request: Request, exc: AppBaseException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
            **exc.extra,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url.path}: {exc}")
    # Prevent exposing internal stack traces to clients
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please contact system support.",
            "error_code": "INTERNAL_SERVER_ERROR",
        },
    )


# Register API Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(health.router, prefix=api_prefix)
app.include_router(products.router, prefix=api_prefix)
app.include_router(visual_search.router, prefix=api_prefix)
app.include_router(search.router, prefix=api_prefix)
app.include_router(compatibility.router, prefix=api_prefix)


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.APP_NAME,
        "version": "3.0.0",
        "documentation": "/docs",
        "health": f"{api_prefix}/health",
        "search": f"{api_prefix}/search",
    }
