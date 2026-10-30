from sqlalchemy.orm import Session
from backend.app.db.session import engine, Base, SessionLocal
from backend.app.db.models import Product
from backend.app.db.seed_data import SAMPLE_PRODUCTS
from backend.app.core.logging import logger


def init_db(db: Session = None) -> int:
    """Creates tables and seeds default products if empty."""
    target_engine = db.bind if (db and db.bind) else engine
    Base.metadata.create_all(bind=target_engine)
    
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        existing_count = db.query(Product).count()
        if existing_count >= len(SAMPLE_PRODUCTS):
            logger.info(f"Database already populated with {existing_count} catalog products.")
            return existing_count

        existing_ids = {p[0] for p in db.query(Product.id).all()}
        new_items = [Product(**item) for item in SAMPLE_PRODUCTS if item["id"] not in existing_ids]
        if new_items:
            db.add_all(new_items)
            db.commit()
        seeded_count = len(new_items)
        logger.info(f"Initialized database and seeded {seeded_count} products.")
        return existing_count + seeded_count
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    count = init_db()
    print(f"Database successfully initialized with {count} seed products.")
