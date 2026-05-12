from app.persistence.db import init_db as bootstrap_db


def init_db(_) -> None:
    bootstrap_db()
