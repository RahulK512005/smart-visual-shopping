import httpx
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.errors import MLServiceUnavailableError, MLServiceTimeoutError
from backend.app.core.logging import logger
from backend.app.schemas.ml_contract import MLSearchResponse


class MLServiceClient:
    """Explicit client defining the integration boundary with the separately hosted AI/ML service."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        connect_timeout: Optional[float] = None,
    ):
        self.base_url = (base_url or settings.ML_SERVICE_URL).rstrip("/")
        self.timeout = timeout or settings.ML_SERVICE_TIMEOUT_SECONDS
        self.connect_timeout = connect_timeout or settings.ML_SERVICE_CONNECT_TIMEOUT_SECONDS

    def check_health(self) -> dict:
        """Pings the ML service health endpoint to verify connectivity."""
        url = f"{self.base_url}/internal/health"
        try:
            with httpx.Client(timeout=httpx.Timeout(self.connect_timeout)) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    return {"status": "reachable", "details": resp.json()}
                return {"status": "degraded", "status_code": resp.status_code}
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}

    def search_by_image(
        self,
        image_bytes: bytes,
        filename: str = "query.jpg",
        content_type: str = "image/jpeg",
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> MLSearchResponse:
        """
        Sends the uploaded image to the internal ML service via POST /internal/search.
        Expects a ranked list of catalog IDs and confidence/similarity scores.
        """
        url = f"{self.base_url}/internal/search"
        logger.info(f"Dispatching visual embedding search to ML service at {url} (size={len(image_bytes)} bytes)")

        timeout_config = httpx.Timeout(
            timeout=self.timeout,
            connect=self.connect_timeout
        )

        files = {
            "file": (filename, image_bytes, content_type)
        }
        data = {
            "limit": str(limit)
        }
        if category_filter:
            data["category_filter"] = category_filter

        try:
            with httpx.Client(timeout=timeout_config) as client:
                response = client.post(url, files=files, data=data)
        except httpx.ConnectTimeout:
            logger.error(f"Connect timeout while reaching ML service at {url}")
            raise MLServiceTimeoutError("Timed out connecting to visual search AI service.")
        except httpx.ReadTimeout:
            logger.error(f"Read timeout waiting for ML inference response from {url}")
            raise MLServiceTimeoutError("Visual search AI inference timed out.")
        except httpx.RequestError as exc:
            logger.error(f"Network error communicating with ML service at {url}: {exc}")
            raise MLServiceUnavailableError(
                f"Visual search AI service is unreachable ({exc.__class__.__name__}). Please ensure ML service is running."
            )

        if response.status_code != 200:
            logger.error(f"ML service returned HTTP {response.status_code}: {response.text}")
            raise MLServiceUnavailableError(
                f"Visual search AI service returned an error status ({response.status_code})."
            )

        try:
            payload = response.json()
            return MLSearchResponse.model_validate(payload)
        except Exception as exc:
            logger.error(f"Malformed response schema from ML service: {exc}, raw: {response.text}")
            raise MLServiceUnavailableError("Received invalid response structure from AI/ML service.")

    def search_by_text(
        self,
        query: str,
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> MLSearchResponse:
        """
        Sends text query to ML service via POST /internal/search-text.
        """
        url = f"{self.base_url}/internal/search-text"
        logger.info(f"Dispatching text query to ML service at {url}: '{query}'")

        timeout_config = httpx.Timeout(timeout=self.timeout, connect=self.connect_timeout)
        payload = {
            "query": query,
            "limit": limit,
            "category_filter": category_filter,
        }

        try:
            with httpx.Client(timeout=timeout_config) as client:
                response = client.post(url, json=payload)
        except httpx.ConnectTimeout:
            raise MLServiceTimeoutError("Timed out connecting to visual search AI service.")
        except httpx.ReadTimeout:
            raise MLServiceTimeoutError("Visual search AI inference timed out.")
        except httpx.RequestError as exc:
            raise MLServiceUnavailableError(
                f"Visual search AI service is unreachable ({exc.__class__.__name__}). Please ensure ML service is running."
            )

        if response.status_code != 200:
            raise MLServiceUnavailableError(
                f"Visual search AI service returned an error status ({response.status_code})."
            )

        try:
            return MLSearchResponse.model_validate(response.json())
        except Exception as exc:
            raise MLServiceUnavailableError(f"Received invalid response structure from AI/ML service: {exc}")

    def search_hybrid(
        self,
        image_bytes: bytes,
        query: str,
        image_weight: float = 0.7,
        text_weight: float = 0.3,
        filename: str = "query.jpg",
        content_type: str = "image/jpeg",
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> MLSearchResponse:
        """
        Sends multimodal image and text query to ML service via POST /internal/search-hybrid.
        """
        url = f"{self.base_url}/internal/search-hybrid"
        logger.info(f"Dispatching hybrid search to ML service at {url} (query='{query}')")

        timeout_config = httpx.Timeout(timeout=self.timeout, connect=self.connect_timeout)
        files = {"file": (filename, image_bytes, content_type)}
        data = {
            "query": query,
            "image_weight": str(image_weight),
            "text_weight": str(text_weight),
            "limit": str(limit),
        }
        if category_filter:
            data["category_filter"] = category_filter

        try:
            with httpx.Client(timeout=timeout_config) as client:
                response = client.post(url, files=files, data=data)
        except httpx.ConnectTimeout:
            raise MLServiceTimeoutError("Timed out connecting to visual search AI service.")
        except httpx.ReadTimeout:
            raise MLServiceTimeoutError("Visual search AI inference timed out.")
        except httpx.RequestError as exc:
            raise MLServiceUnavailableError(
                f"Visual search AI service is unreachable ({exc.__class__.__name__}). Please ensure ML service is running."
            )

        if response.status_code != 200:
            raise MLServiceUnavailableError(
                f"Visual search AI service returned an error status ({response.status_code})."
            )

        try:
            return MLSearchResponse.model_validate(response.json())
        except Exception as exc:
            raise MLServiceUnavailableError(f"Received invalid response structure from AI/ML service: {exc}")
