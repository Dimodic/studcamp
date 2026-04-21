from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.deps import get_current_user
from backend.app.db.base import Base
from backend.app.db.seed import seed_database
from backend.app.main import create_app
from backend.app.models.entities import User


@pytest.fixture()
def db_session(tmp_path: Path) -> Generator[Session, None, None]:
    db_file = tmp_path / "studcamp-test.sqlite3"
    engine = create_engine(f"sqlite:///{db_file}", future=True)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    seed_database(session)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


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
