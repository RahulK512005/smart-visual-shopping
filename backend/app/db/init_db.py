from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import Product
from backend.app.db.repositories.product_repo import ProductRepository
from backend.app.db.seed_data import SAMPLE_PRODUCTS
from backend.app.core.logging import logger


def init_db(db: Session = None) -> int:
    """Creates tables and seeds default products if empty."""
    Base.metadata.create_all(bind=engine)
    
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        repo = ProductRepository(db)
        seeded_count = 0
        for item in SAMPLE_PRODUCTS:
            repo.upsert(item)
            seeded_count += 1
        logger.info(f"Initialized database and seeded {seeded_count} products.")
        return seeded_count
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    count = init_db()
    print(f"Database successfully initialized with {count} seed products.")
