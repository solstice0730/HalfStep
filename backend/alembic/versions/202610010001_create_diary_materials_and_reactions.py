"""create diary materials and community post reactions

Revision ID: 202610010001
Revises: 202607210001
Create Date: 2026-10-01 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "202610010001"
down_revision: Union[str, None] = "202607210001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "diary_materials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("baby_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("material_date", sa.Date(), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["baby_id"], ["babies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_diary_materials_id"), "diary_materials", ["id"], unique=False)
    op.create_index(op.f("ix_diary_materials_baby_id"), "diary_materials", ["baby_id"], unique=False)
    op.create_index(op.f("ix_diary_materials_user_id"), "diary_materials", ["user_id"], unique=False)
    op.create_index(op.f("ix_diary_materials_material_date"), "diary_materials", ["material_date"], unique=False)

    op.create_table(
        "community_post_reactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("reaction_type", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["community_posts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", "reaction_type", name="uq_post_reaction"),
    )
    op.create_index(op.f("ix_community_post_reactions_post_id"), "community_post_reactions", ["post_id"], unique=False)
    op.create_index(op.f("ix_community_post_reactions_user_id"), "community_post_reactions", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_community_post_reactions_reaction_type"), "community_post_reactions", ["reaction_type"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_community_post_reactions_reaction_type"), table_name="community_post_reactions")
    op.drop_index(op.f("ix_community_post_reactions_user_id"), table_name="community_post_reactions")
    op.drop_index(op.f("ix_community_post_reactions_post_id"), table_name="community_post_reactions")
    op.drop_table("community_post_reactions")
    op.drop_index(op.f("ix_diary_materials_material_date"), table_name="diary_materials")
    op.drop_index(op.f("ix_diary_materials_user_id"), table_name="diary_materials")
    op.drop_index(op.f("ix_diary_materials_baby_id"), table_name="diary_materials")
    op.drop_index(op.f("ix_diary_materials_id"), table_name="diary_materials")
    op.drop_table("diary_materials")
