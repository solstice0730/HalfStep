"""localize community category names

Revision ID: 202607131000
Revises: 202607130900
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607131000"
down_revision: str | None = "202607130900"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

KOREAN_NAMES = {
    "PREGNANCY": "임신",
    "BIRTH_STORY": "출산 후기",
    "POSTPARTUM_CENTER": "조리원 정보",
    "NEWBORN": "신생아",
    "FEEDING": "수유·이유식",
    "HEALTH": "건강·병원",
    "SLEEP_DEVELOPMENT": "수면·발달",
    "FREE": "자유",
    "COUNSELING": "고민 상담",
}

ENGLISH_NAMES = {
    "PREGNANCY": "Pregnancy",
    "BIRTH_STORY": "Birth stories",
    "POSTPARTUM_CENTER": "Postpartum centers",
    "NEWBORN": "Newborn",
    "FEEDING": "Feeding",
    "HEALTH": "Health",
    "SLEEP_DEVELOPMENT": "Sleep and development",
    "FREE": "Free talk",
    "COUNSELING": "Counseling",
}


def _update_names(names: dict[str, str]) -> None:
    category_table = sa.table(
        "community_categories",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
    )
    for code, name in names.items():
        op.execute(category_table.update().where(category_table.c.code == code).values(name=name))


def upgrade() -> None:
    _update_names(KOREAN_NAMES)


def downgrade() -> None:
    _update_names(ENGLISH_NAMES)
