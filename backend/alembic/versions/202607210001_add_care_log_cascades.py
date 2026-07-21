'''add cascade deletes to care log ownership

Revision ID: 202607210001
Revises: 202607200001
Create Date: 2026-07-21 00:00:00.000000
'''

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = '202607210001'
down_revision: str | None = '202607200001'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _replace_foreign_key(column: str, target: str, ondelete: str | None) -> None:
    inspector = sa.inspect(op.get_bind())
    foreign_key = next(
        fk
        for fk in inspector.get_foreign_keys('care_logs')
        if fk['constrained_columns'] == [column]
    )
    current_ondelete = (foreign_key.get('options') or {}).get('ondelete')
    if (current_ondelete or '').upper() == (ondelete or '').upper():
        return

    op.drop_constraint(foreign_key['name'], 'care_logs', type_='foreignkey')
    target_table, target_column = target.split('.')
    op.create_foreign_key(
        f'fk_care_logs_{column}',
        'care_logs',
        target_table,
        [column],
        [target_column],
        ondelete=ondelete,
    )


def upgrade() -> None:
    _replace_foreign_key('baby_id', 'babies.id', 'CASCADE')
    _replace_foreign_key('user_id', 'users.id', 'CASCADE')


def downgrade() -> None:
    _replace_foreign_key('baby_id', 'babies.id', None)
    _replace_foreign_key('user_id', 'users.id', None)
