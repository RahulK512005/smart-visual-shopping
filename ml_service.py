"""
ML Service entrypoint.
Alias to mock_ml_service for backwards compatibility.
"""
from mock_ml_service import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ml_service:app", host="127.0.0.1", port=8001, reload=True)
