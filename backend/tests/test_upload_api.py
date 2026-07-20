import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.core.config import settings
from app.main import app
from app.models.user import User


class UploadApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.original_upload_dir = settings.UPLOAD_DIR
        settings.UPLOAD_DIR = self.temp_dir.name
        self.static_app = self._get_static_app()
        if self.static_app is not None:
            self.original_static_directory = self.static_app.directory
            self.original_all_directories = self.static_app.all_directories
            self.static_app.directory = self.temp_dir.name
            self.static_app.all_directories = [self.temp_dir.name]

        self.user = User(
            id=1,
            social_provider="google",
            social_user_id="upload-owner",
            nickname="owner",
        )
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        settings.UPLOAD_DIR = self.original_upload_dir
        if self.static_app is not None:
            self.static_app.directory = self.original_static_directory
            self.static_app.all_directories = self.original_all_directories
        self.temp_dir.cleanup()

    @staticmethod
    def _get_static_app():
        for route in app.routes:
            if getattr(route, "path", None) == "/uploads":
                return route.app
        return None

    def test_authentication_is_required(self) -> None:
        app.dependency_overrides.pop(get_current_user)

        response = self.client.post(
            "/api/uploads/images",
            files={"file": ("photo.jpg", b"jpeg-data", "image/jpeg")},
        )

        self.assertEqual(response.status_code, 401)

    def test_upload_returns_absolute_url_with_uuid_filename(self) -> None:
        response = self.client.post(
            "/api/uploads/images",
            files={"file": ("photo.jpg", b"jpeg-data", "image/jpeg")},
        )

        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertTrue(body["success"])
        url = body["data"]["url"]
        self.assertRegex(
            url,
            r"^http://testserver/uploads/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$",
        )
        filename = url.rsplit("/", 1)[-1]
        self.assertEqual((Path(self.temp_dir.name) / filename).read_bytes(), b"jpeg-data")

    def test_rejects_unsupported_content_type(self) -> None:
        response = self.client.post(
            "/api/uploads/images",
            files={"file": ("photo.gif", b"gif-data", "image/gif")},
        )

        self.assertEqual(response.status_code, 415)
        self.assertEqual(list(Path(self.temp_dir.name).iterdir()), [])

    def test_rejects_files_larger_than_ten_megabytes(self) -> None:
        response = self.client.post(
            "/api/uploads/images",
            files={"file": ("large.png", b"x" * (10 * 1024 * 1024 + 1), "image/png")},
        )

        self.assertEqual(response.status_code, 413)
        self.assertEqual(list(Path(self.temp_dir.name).iterdir()), [])

    def test_uploaded_file_is_served_from_returned_url(self) -> None:
        uploaded = self.client.post(
            "/api/uploads/images",
            files={"file": ("photo.webp", b"webp-data", "image/webp")},
        )
        self.assertEqual(uploaded.status_code, 201, uploaded.text)

        response = self.client.get(uploaded.json()["data"]["url"])

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"webp-data")
        self.assertEqual(response.headers["content-type"], "image/webp")


if __name__ == "__main__":
    unittest.main()
