"""
CLIP Visual Embedding Service.
Loads openai/clip-vit-base-patch32 once using Hugging Face Transformers and PyTorch.
Extracts L2-normalized 512-dimensional visual embeddings for query and catalog images.
"""
import io
import os
from typing import List, Optional, Union
import numpy as np
import torch
from PIL import Image, UnidentifiedImageError
from transformers import CLIPModel, CLIPProcessor

from backend.app.core.config import settings
from backend.app.core.logging import logger

# Prevent decompression bomb DOS attacks
Image.MAX_IMAGE_PIXELS = 20_000_000

EMBEDDING_DIM = 512


class ClipEmbeddingService:
    """Manages loading and inference for the pretrained CLIP visual model."""

    def __init__(
        self,
        model_id: Optional[str] = None,
        device: Optional[str] = None,
    ):
        self.model_id = model_id or getattr(settings, "CLIP_MODEL_ID", "openai/clip-vit-base-patch32")
        configured_device = (device or getattr(settings, "CLIP_DEVICE", "auto")).lower()

        if configured_device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        elif configured_device == "cuda":
            if not torch.cuda.is_available():
                logger.warning("CUDA requested for CLIP, but CUDA is not available. Falling back to CPU.")
                self.device = torch.device("cpu")
            else:
                self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        self.processor: Optional[CLIPProcessor] = None
        self.model: Optional[CLIPModel] = None
        self._is_initialized = False

    def load_model(self) -> None:
        """Loads model and processor once into memory and sets to evaluation mode."""
        if self._is_initialized and self.model is not None and self.processor is not None:
            return

        logger.info(f"Loading CLIP model '{self.model_id}' on device: {self.device}")
        try:
            self.processor = CLIPProcessor.from_pretrained(self.model_id)
            self.model = CLIPModel.from_pretrained(self.model_id)
            self.model.to(self.device)
            self.model.eval()
            self._is_initialized = True
            logger.info(f"CLIP model '{self.model_id}' successfully loaded on {self.device}.")
        except Exception as exc:
            logger.error(f"Failed to load CLIP model '{self.model_id}': {exc}")
            raise RuntimeError(f"Could not initialize CLIP model '{self.model_id}': {exc}") from exc

    @property
    def is_ready(self) -> bool:
        return self._is_initialized and self.model is not None and self.processor is not None

    def validate_and_load_image(self, image_data: Union[bytes, io.BytesIO, Image.Image]) -> Image.Image:
        """
        Validates image data safely:
        - Checks image readability
        - Defends against corrupted headers and decompression bombs
        - Converts to standard RGB
        """
        if isinstance(image_data, Image.Image):
            return image_data.convert("RGB")

        if isinstance(image_data, bytes):
            if len(image_data) == 0:
                raise ValueError("Image byte buffer is empty.")
            stream = io.BytesIO(image_data)
        elif isinstance(image_data, io.BytesIO):
            stream = image_data
        else:
            raise TypeError(f"Unsupported image input type: {type(image_data)}")

        try:
            with Image.open(stream) as img:
                img.verify()
            stream.seek(0)
            img = Image.open(stream)
            rgb_image = img.convert("RGB")
            # Force loading pixel data before closing stream
            rgb_image.load()
            return rgb_image
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
            raise ValueError(f"Corrupted or unsupported image file: {exc}") from exc

    def extract_image_embedding(self, image_input: Union[bytes, Image.Image]) -> np.ndarray:
        """
        Extracts a single L2-normalized 512-dimensional embedding for an image.
        Returns a 1-D numpy float32 array of shape (512,).
        """
        if not self.is_ready:
            self.load_model()

        pil_image = self.validate_and_load_image(image_input)

        inputs = self.processor(images=pil_image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = self.model.get_image_features(**inputs)
            # Support both tensor output and object output across transformers versions
            if hasattr(outputs, "image_embeds"):
                feats = outputs.image_embeds
            elif hasattr(outputs, "pooler_output"):
                feats = outputs.pooler_output
            else:
                feats = outputs

            # L2 normalize
            norm = feats.norm(p=2, dim=-1, keepdim=True)
            normalized_feats = feats / (norm + 1e-12)

        embedding = normalized_feats.cpu().numpy().astype(np.float32).flatten()
        return embedding

    def extract_batch_embeddings(self, images: List[Union[bytes, Image.Image]]) -> np.ndarray:
        """
        Extracts L2-normalized 512-dimensional embeddings for a batch of images.
        Returns a 2-D numpy float32 array of shape (N, 512).
        """
        if not self.is_ready:
            self.load_model()

        if not images:
            return np.empty((0, EMBEDDING_DIM), dtype=np.float32)

        pil_images = [self.validate_and_load_image(img) for img in images]

        inputs = self.processor(images=pil_images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.inference_mode():
            outputs = self.model.get_image_features(**inputs)
            if hasattr(outputs, "image_embeds"):
                feats = outputs.image_embeds
            elif hasattr(outputs, "pooler_output"):
                feats = outputs.pooler_output
            else:
                feats = outputs

            norm = feats.norm(p=2, dim=-1, keepdim=True)
            normalized_feats = feats / (norm + 1e-12)

        embeddings = normalized_feats.cpu().numpy().astype(np.float32)
        return embeddings


# Singleton service instance
_clip_service_instance: Optional[ClipEmbeddingService] = None


def get_clip_service() -> ClipEmbeddingService:
    global _clip_service_instance
    if _clip_service_instance is None:
        _clip_service_instance = ClipEmbeddingService()
    return _clip_service_instance
