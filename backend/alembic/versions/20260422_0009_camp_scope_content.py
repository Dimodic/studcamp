"""Привязка content-entities к конкретному кемпу.

Projects / Stories / OrgUpdates / Materials / Resources / CampusCategories
получают NOT NULL camp_id. При миграции все существующие строки
backfill-ятся активным кемпом (если его нет — первым по id), чтобы старые
seeded-данные остались видимыми у своего кемпа.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260422_0009"
down_revision = "20260422_0008"
branch_labels = None
depends_on = None

_TABLES = (
    "projects",
    "stories",
    "org_updates",
    "materials",
    "resources",
    "campus_categories",
)


def upgrade() -> None:
    # 1. Добавляем nullable camp_id, чтобы существующие строки не падали.
    for table in _TABLES:
        op.add_column(table, sa.Column("camp_id", sa.String(length=64), nullable=True))

    # 2. Backfill: все существующие строки привязываем к активному кемпу
    #    (если он есть), иначе — к первому по id.
    op.execute(
        """
        UPDATE projects SET camp_id = (
            SELECT id FROM camps
            ORDER BY is_active DESC, id ASC
            LIMIT 1
        )
        WHERE camp_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE stories SET camp_id = (
            SELECT id FROM camps ORDER BY is_active DESC, id ASC LIMIT 1
        ) WHERE camp_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE org_updates SET camp_id = (
            SELECT id FROM camps ORDER BY is_active DESC, id ASC LIMIT 1
        ) WHERE camp_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE materials SET camp_id = (
            SELECT id FROM camps ORDER BY is_active DESC, id ASC LIMIT 1
        ) WHERE camp_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE resources SET camp_id = (
            SELECT id FROM camps ORDER BY is_active DESC, id ASC LIMIT 1
        ) WHERE camp_id IS NULL
        """
    )
    op.execute(
        """
        UPDATE campus_categories SET camp_id = (
            SELECT id FROM camps ORDER BY is_active DESC, id ASC LIMIT 1
        ) WHERE camp_id IS NULL
        """
    )

    # 3. Делаем NOT NULL + foreign key + индекс.
    for table in _TABLES:
        op.alter_column(table, "camp_id", existing_type=sa.String(length=64), nullable=False)
        op.create_index(f"ix_{table}_camp_id", table, ["camp_id"])
        op.create_foreign_key(
            f"fk_{table}_camp_id_camps",
            table,
            "camps",
            ["camp_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    for table in _TABLES:
        op.drop_constraint(f"fk_{table}_camp_id_camps", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_camp_id", table_name=table)
        op.drop_column(table, "camp_id")
