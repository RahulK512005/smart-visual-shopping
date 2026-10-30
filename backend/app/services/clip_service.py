"""
FashionCLIP Visual Embedding Service.
Loads Marqo/marqo-fashionCLIP using OpenCLIP and PyTorch.
Extracts L2-normalized 512-dimensional visual and text embeddings for fashion product retrieval.
"""
import io
import os
from typing import List, Optional, Union
import numpy as np
import open_clip
import torch
from PIL import Image, UnidentifiedImageError

from backend.app.core.config import settings
from backend.app.core.logging import logger

# Prevent decompression bomb DOS attacks
Image.MAX_IMAGE_PIXELS = 20_000_000

EMBEDDING_DIM = 512


class ClipEmbeddingService:
    """Manages loading and inference for Marqo/marqo-fashionCLIP."""

    def __init__(
        self,
        model_id: Optional[str] = None,
        device: Optional[str] = None,
    ):
        self.model_id = model_id or getattr(settings, "CLIP_MODEL_ID", "hf-hub:Marqo/marqo-fashionCLIP")
        configured_device = (device or getattr(settings, "CLIP_DEVICE", "auto")).lower()

        if configured_device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        elif configured_device == "cuda":
            if not torch.cuda.is_available():
                logger.warning("CUDA requested for FashionCLIP, but CUDA is not available. Falling back to CPU.")
                self.device = torch.device("cpu")
            else:
                self.device = torch.device("cuda")
        else:
            self.device = torch.device("cpu")

        self.model = None
        self.preprocess = None
        self.tokenizer = None
        self.embedding_dim = EMBEDDING_DIM
        self._is_initialized = False

    def load_model(self) -> None:
        """Loads model, preprocess transforms, and tokenizer once into memory."""
        if self._is_initialized and self.model is not None and self.preprocess is not None:
            return

        logger.info(f"Loading FashionCLIP model '{self.model_id}' on device: {self.device}")
        try:
            model, _, preprocess = open_clip.create_model_and_transforms(self.model_id)
            tokenizer = open_clip.get_tokenizer(self.model_id)

            if self.device.type == "cpu":
                torch.set_num_threads(min(4, max(1, os.cpu_count() or 1)))

            model.to(self.device)
            model.eval()

            # Dynamically verify embedding dimension at runtime
            with torch.inference_mode():
                dummy_input = torch.zeros(1, 3, 224, 224, device=self.device)
                dummy_feat = model.encode_image(dummy_input)
                self.embedding_dim = int(dummy_feat.shape[-1])

            self.model = model
            self.preprocess = preprocess
            self.tokenizer = tokenizer
            self._is_initialized = True
            logger.info(
                f"FashionCLIP model '{self.model_id}' successfully loaded on {self.device} (dim={self.embedding_dim})."
            )
        except Exception as exc:
            logger.error(f"Failed to load FashionCLIP model '{self.model_id}': {exc}")
            raise RuntimeError(f"Could not initialize FashionCLIP model '{self.model_id}': {exc}") from exc

    @property
    def is_ready(self) -> bool:
        return self._is_initialized and self.model is not None and self.preprocess is not None

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
            # Downscale oversized images to save memory before transforms
            if max(rgb_image.size) > 1024:
                rgb_image.thumbnail((1024, 1024), Image.Resampling.BILINEAR)
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
        image_tensor = self.preprocess(pil_image).unsqueeze(0).to(self.device)

        with torch.inference_mode():
            feat = self.model.encode_image(image_tensor)
            norm = feat.norm(p=2, dim=-1, keepdim=True)
            normalized_feat = feat / (norm + 1e-12)

        embedding = normalized_feat.cpu().numpy().astype(np.float32).flatten()
        if len(embedding) != self.embedding_dim:
            raise ValueError(f"Embedding dimension mismatch: expected {self.embedding_dim}, got {len(embedding)}")
        return embedding

    def extract_text_embedding(self, text: str) -> np.ndarray:
        """
        Extracts an L2-normalized 512-dimensional text embedding for cross-modal search.
        Returns a 1-D numpy float32 array of shape (512,).
        """
        if not self.is_ready:
            self.load_model()

        tokens = self.tokenizer([text]).to(self.device)
        with torch.inference_mode():
            feat = self.model.encode_text(tokens)
            norm = feat.norm(p=2, dim=-1, keepdim=True)
            normalized_feat = feat / (norm + 1e-12)

        embedding = normalized_feat.cpu().numpy().astype(np.float32).flatten()
        if len(embedding) != self.embedding_dim:
            raise ValueError(f"Text embedding dimension mismatch: expected {self.embedding_dim}, got {len(embedding)}")
        return embedding

    def extract_batch_embeddings(self, images: List[Union[bytes, Image.Image]]) -> np.ndarray:
        """
        Extracts L2-normalized 512-dimensional embeddings for a batch of images.
        Returns a 2-D numpy float32 array of shape (N, 512).
        """
        if not self.is_ready:
            self.load_model()

        if not images:
            return np.empty((0, self.embedding_dim), dtype=np.float32)

        pil_images = [self.validate_and_load_image(img) for img in images]
        image_tensors = torch.stack([self.preprocess(img) for img in pil_images]).to(self.device)

        with torch.inference_mode():
            feats = self.model.encode_image(image_tensors)
            norm = feats.norm(p=2, dim=-1, keepdim=True)
            normalized_feats = feats / (norm + 1e-12)

        embeddings = normalized_feats.cpu().numpy().astype(np.float32)
        if embeddings.shape[1] != self.embedding_dim:
            raise ValueError(f"Batch dimension mismatch: expected {self.embedding_dim}, got {embeddings.shape[1]}")
        return embeddings


# Singleton service instance
_clip_service_instance: Optional[ClipEmbeddingService] = None


def get_clip_service() -> ClipEmbeddingService:
    global _clip_service_instance
    if _clip_service_instance is None:
        _clip_service_instance = ClipEmbeddingService()
    return _clip_service_instance
