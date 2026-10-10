import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.app.db.init_db import init_db

if __name__ == "__main__":
    print("Initializing Smart Visual Shopping database and seeding catalog...")
    count = init_db()
    print(f"Successfully initialized and verified {count} products in catalog.")
