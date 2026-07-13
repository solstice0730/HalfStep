"""add community post baby age

Revision ID: 202607131100
Revises: 202607131000
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607131100"
down_revision: str | None = "202607131000"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "community_posts",
        sa.Column("baby_age_months", sa.SmallInteger(), nullable=True),
    )
    op.create_index(
        "ix_community_posts_baby_age_months",
        "community_posts",
        ["baby_age_months"],
    )


def downgrade() -> None:
    op.drop_index("ix_community_posts_baby_age_months", table_name="community_posts")
    op.drop_column("community_posts", "baby_age_months")
