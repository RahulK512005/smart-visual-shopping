# ========================================================
# AI/ML Visual Embedding Search Service (OpenAI CLIP + FAISS)
# ========================================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_ENABLE_HF_TRANSFER=0

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download and cache CLIP model weights into the container image
RUN python -c "from transformers import CLIPModel, CLIPProcessor; \
    print('Pre-caching openai/clip-vit-base-patch32 weights...'); \
    CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32'); \
    CLIPModel.from_pretrained('openai/clip-vit-base-patch32'); \
    print('CLIP model cached successfully.')"

# Copy source code and vector indices
COPY backend/ backend/
COPY ml_service.py mock_ml_service.py .

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/internal/health || exit 1

CMD ["uvicorn", "ml_service:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
