from typing import Any, Optional
from fastapi import HTTPException, status


class AppBaseException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        extra: Optional[dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.extra = extra or {}


class ProductNotFoundError(AppBaseException):
    def __init__(self, product_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' was not found in catalog.",
            error_code="PRODUCT_NOT_FOUND",
            extra={"product_id": product_id},
        )


class InvalidImageError(AppBaseException):
    def __init__(self, detail: str, error_code: str = "INVALID_IMAGE"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code,
        )


class MLServiceUnavailableError(AppBaseException):
    def __init__(self, detail: str = "Visual search AI service is currently unavailable. Please retry shortly."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="ML_SERVICE_UNAVAILABLE",
        )


class MLServiceTimeoutError(AppBaseException):
    def __init__(self, detail: str = "Visual search AI service request timed out."):
        super().__init__(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=detail,
            error_code="ML_SERVICE_TIMEOUT",
        )


class CompatibilityEvaluationError(AppBaseException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="COMPATIBILITY_EVALUATION_ERROR",
        )
