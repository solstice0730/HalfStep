"""create community tables

Revision ID: 202607130900
Revises: 202607150900
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607130900"
down_revision: str | None = "202607150900"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIES = [
    ("PREGNANCY", "Pregnancy", 10),
    ("BIRTH_STORY", "Birth stories", 20),
    ("POSTPARTUM_CENTER", "Postpartum centers", 30),
    ("NEWBORN", "Newborn", 40),
    ("FEEDING", "Feeding", 50),
    ("HEALTH", "Health", 60),
    ("SLEEP_DEVELOPMENT", "Sleep and development", 70),
    ("FREE", "Free talk", 80),
    ("COUNSELING", "Counseling", 90),
]


def upgrade() -> None:
    op.create_table(
        "community_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(40), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_community_categories_code", "community_categories", ["code"], unique=True)
    op.create_index("ix_community_categories_is_active", "community_categories", ["is_active"])
    op.create_table(
        "community_posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(150), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("image_urls", sa.JSON(), nullable=False),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["community_categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_community_posts_category_id", "community_posts", ["category_id"])
    op.create_index("ix_community_posts_user_id", "community_posts", ["user_id"])
    op.create_index("ix_community_posts_id", "community_posts", ["id"])
    category_table = sa.table(
        "community_categories",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("description", sa.Text),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        category_table,
        [
            {"code": code, "name": name, "sort_order": order, "description": None, "is_active": True}
            for code, name, order in CATEGORIES
        ],
    )


def downgrade() -> None:
    op.drop_table("community_posts")
    op.drop_table("community_categories")
