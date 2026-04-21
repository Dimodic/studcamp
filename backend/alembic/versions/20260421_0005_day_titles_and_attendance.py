"""Add camp.day_titles and event_checkins.source."""

from alembic import op
import sqlalchemy as sa


revision = "20260421_0005"
down_revision = "20260421_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("camps", sa.Column("day_titles", sa.JSON(), nullable=True))
    op.add_column(
        "event_checkins",
        sa.Column("source", sa.String(length=16), nullable=False, server_default="self"),
    )


def downgrade() -> None:
    op.drop_column("event_checkins", "source")
    op.drop_column("camps", "day_titles")
