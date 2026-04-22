"""User.telegram_id для авторизации через Telegram WebApp."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260422_0010"
down_revision = "20260422_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.create_unique_constraint("uq_users_telegram_id", "users", ["telegram_id"])
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])


def downgrade() -> None:
    op.drop_index("ix_users_telegram_id", table_name="users")
    op.drop_constraint("uq_users_telegram_id", "users", type_="unique")
    op.drop_column("users", "telegram_id")
