"""Add resources and visibility support for real camp snapshot."""

from alembic import op
import sqlalchemy as sa


revision = "20260419_0002"
down_revision = "20260418_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("show_in_people", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column("users", "show_in_people", server_default=None)

    op.add_column(
        "events",
        sa.Column("event_date", sa.Date(), nullable=False, server_default=sa.text("'2026-04-13'")),
    )
    op.alter_column("events", "event_date", server_default=None)

    op.create_table(
        "resources",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("day", sa.Integer(), nullable=True),
        sa.Column("event_id", sa.String(length=64), nullable=True),
        sa.Column("is_new", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("resources")
    op.drop_column("events", "event_date")
    op.drop_column("users", "show_in_people")
