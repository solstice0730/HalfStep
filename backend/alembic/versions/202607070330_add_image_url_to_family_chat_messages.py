"""add image url to family chat messages

Revision ID: 202607070330
Revises: 202607070310
Create Date: 2026-07-07 12:30:00.000000
"""
from collections.abc import Sequence

from alembic import context, op
import sqlalchemy as sa


revision: str = "202607070330"
down_revision: str | None = "202607070310"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    columns = set()
    if not context.is_offline_mode():
        columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("family_chat_messages")}

    if context.is_offline_mode() or "image_url" not in columns:
        op.add_column("family_chat_messages", sa.Column("image_url", sa.String(length=500), nullable=True))
        op.alter_column("family_chat_messages", "content", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    columns = set()
    if not context.is_offline_mode():
        columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("family_chat_messages")}

    if context.is_offline_mode() or "image_url" in columns:
        op.alter_column("family_chat_messages", "content", existing_type=sa.Text(), nullable=False)
        op.drop_column("family_chat_messages", "image_url")
