"""create community comments

Revision ID: 202610010002
Revises: 202610010001
Create Date: 2026-10-01 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "202610010002"
down_revision: Union[str, None] = "202610010001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "community_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_community_comments_id"), "community_comments", ["id"], unique=False)
    op.create_index(op.f("ix_community_comments_post_id"), "community_comments", ["post_id"], unique=False)
    op.create_index(op.f("ix_community_comments_user_id"), "community_comments", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_community_comments_user_id"), table_name="community_comments")
    op.drop_index(op.f("ix_community_comments_post_id"), table_name="community_comments")
    op.drop_index(op.f("ix_community_comments_id"), table_name="community_comments")
    op.drop_table("community_comments")
