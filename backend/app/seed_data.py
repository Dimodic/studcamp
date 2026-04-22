"""Запуск seed'а из CLI: `python -m backend.app.seed_data`.

По умолчанию идемпотентен — если в БД уже есть хотя бы один кемп,
пропускает сид. Это позволяет безопасно дёргать команду на старте
контейнера (docker compose up), не боясь перетереть существующие данные.

Флаг --force насильно запускает seed, перезаписывая таблицы.
"""

from __future__ import annotations

import sys

from sqlalchemy import select

from backend.app.db.seed import seed_database
from backend.app.db.session import SessionLocal
from backend.app.models.entities import Camp


def main(argv: list[str] | None = None) -> None:
    args = argv if argv is not None else sys.argv[1:]
    force = "--force" in args

    db = SessionLocal()
    try:
        if not force:
            existing = db.scalar(select(Camp).limit(1))
            if existing is not None:
                print(
                    f"Seed skipped: camp '{existing.id}' already exists (use --force to override)."
                )
                return
        seed_database(db)
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
