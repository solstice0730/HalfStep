"""참조되지 않는 업로드 파일 정리.

일기 재료 화면은 사진을 고르는 즉시 업로드하므로, 일기를 저장하지 않으면 파일만 남는다.
diary_photos·community_posts.image_urls·care_logs(extra_data.photoUrl)에서 참조하지 않고
N일(기본 3일) 이상 지난 파일을 삭제한다.

사용: python scripts/cleanup_uploads.py [--days 3] [--dry-run]
cron 예: 0 4 * * * cd /app && python scripts/cleanup_uploads.py --days 3
"""

import argparse
import time
from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.community import CommunityPost
from app.models.diary import DiaryPhoto
from app.models.records import CareLog


def referenced_filenames(db) -> set[str]:
    names: set[str] = set()
    for url in db.scalars(select(DiaryPhoto.image_url)):
        names.add(Path(url).name)
    for image_urls in db.scalars(select(CommunityPost.image_urls)):
        for url in image_urls or []:
            names.add(Path(url).name)
    for extra in db.scalars(select(CareLog.extra_data)):
        photo_url = (extra or {}).get("photoUrl")
        if photo_url:
            names.add(Path(photo_url).name)
    return names


def cleanup(days: int, dry_run: bool) -> tuple[int, int]:
    upload_dir = Path(settings.UPLOAD_DIR)
    if not upload_dir.is_dir():
        return 0, 0
    cutoff = time.time() - days * 86400
    with SessionLocal() as db:
        keep = referenced_filenames(db)
    removed = scanned = 0
    for file_path in upload_dir.iterdir():
        if not file_path.is_file():
            continue
        scanned += 1
        if file_path.name in keep or file_path.stat().st_mtime > cutoff:
            continue
        print(f"{'[dry-run] ' if dry_run else ''}delete {file_path.name}")
        if not dry_run:
            file_path.unlink(missing_ok=True)
        removed += 1
    return scanned, removed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=3)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    scanned, removed = cleanup(args.days, args.dry_run)
    print(f"scanned {scanned}, removed {removed}")
