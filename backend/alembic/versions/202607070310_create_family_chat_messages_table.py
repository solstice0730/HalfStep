"""create family chat messages table

Revision ID: 202607070310
Revises: 202607070245
Create Date: 2026-07-07 12:10:00.000000
"""
from collections.abc import Sequence

from alembic import context, op
import sqlalchemy as sa


revision: str = "202607070310"
down_revision: str | None = "202607070245"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    existing_tables = set()
    if not context.is_offline_mode():
        existing_tables = set(sa.inspect(op.get_bind()).get_table_names())

    if "family_chat_messages" in existing_tables:
        return

    op.create_table(
        "family_chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("family_room_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["family_room_id"], ["family_rooms.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_family_chat_messages_family_room_id"),
        "family_chat_messages",
        ["family_room_id"],
        unique=False,
    )
    op.create_index(op.f("ix_family_chat_messages_id"), "family_chat_messages", ["id"], unique=False)
    op.create_index(op.f("ix_family_chat_messages_user_id"), "family_chat_messages", ["user_id"], unique=False)


def downgrade() -> None:
    existing_tables = set()
    if not context.is_offline_mode():
        existing_tables = set(sa.inspect(op.get_bind()).get_table_names())

    if context.is_offline_mode() or "family_chat_messages" in existing_tables:
        op.drop_index(op.f("ix_family_chat_messages_user_id"), table_name="family_chat_messages")
        op.drop_index(op.f("ix_family_chat_messages_id"), table_name="family_chat_messages")
        op.drop_index(op.f("ix_family_chat_messages_family_room_id"), table_name="family_chat_messages")
        op.drop_table("family_chat_messages")
