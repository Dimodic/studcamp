from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import pytest
from backend.app.db.base import Base
from backend.app.db.seed import seed_database
from backend.app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Тесты работают против синтетического mock-сида (tests/fixtures/), а не
# минимального production-сида. Это даёт стабильные предсказуемые имена
# пользователей/событий/проектов, на которые они завязаны. Сам production
# seed (backend/seeds/initial_data.json) можно свободно менять, равно как и
# регенерировать фикстуру через tests/fixtures/generate_mock.py.
_TEST_SEED_PATH = Path(__file__).resolve().parent / "fixtures" / "mock_snapshot.json"


@pytest.fixture()
def db_session(tmp_path: Path) -> Generator[Session, None, None]:
    db_file = tmp_path / "studcamp-test.sqlite3"
    engine = create_engine(f"sqlite:///{db_file}", future=True)
    TestingSessionLocal = sessionmaker(  # noqa: N806 — SQLAlchemy naming convention
        bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session
    )
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_database(session, seed_path=_TEST_SEED_PATH)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()  # закрыть connection pool, иначе ResourceWarning


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    app = create_app()

    def override_get_db():
        yield db_session

    app.dependency_overrides = {}
    from backend.app.db.session import get_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client
