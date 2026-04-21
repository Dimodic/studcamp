from backend.app.db.seed import seed_database
from backend.app.db.session import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
