import logging
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Smart Visual Shopping API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./smart_visual_shopping.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://smart-visual-frontend.onrender.com"

    # ML Service boundary
    ML_SERVICE_URL: str = "http://localhost:8001"
    ML_SERVICE_TIMEOUT_SECONDS: float = 5.0
    ML_SERVICE_CONNECT_TIMEOUT_SECONDS: float = 2.0

    # Uploads
    MAX_IMAGE_UPLOAD_MB: int = 10
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_MIME_TYPES: str = "image/jpeg,image/png,image/webp,image/gif"

    # CLIP & Vector Index Configuration
    CLIP_MODEL_ID: str = "openai/clip-vit-base-patch32"
    CLIP_DEVICE: str = "auto"
    VECTOR_INDEX_PATH: str = "backend/app/services/catalog_faiss.index"
    VECTOR_METADATA_PATH: str = "backend/app/services/catalog_meta.json"
    VISUAL_SEARCH_TOP_K: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        if "https://smart-visual-frontend.onrender.com" not in origins and "*" not in origins:
            origins.append("https://smart-visual-frontend.onrender.com")
        return origins

    @property
    def allowed_mime_types_list(self) -> List[str]:
        return [mime.strip().lower() for mime in self.ALLOWED_IMAGE_MIME_TYPES.split(",") if mime.strip()]


settings = Settings()
