"""LLM 공급자 추상화. 기본은 Gemini(REST)이고 OpenAI는 호환용으로 남겨둔다.

AI_PROVIDER: auto | gemini | openai | none
- auto: GEMINI_API_KEY가 있으면 Gemini, 없고 OPENAI_API_KEY가 있으면 OpenAI, 둘 다 없으면 규칙 기반 fallback.
"""

from __future__ import annotations

import base64
import logging
import mimetypes
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


class LlmError(Exception):
    """모델 호출 실패. 호출부는 이 예외만 잡고 규칙 기반 fallback으로 넘어간다."""


@dataclass(frozen=True)
class ImageInput:
    mime_type: str
    data_base64: str


class LlmClient(Protocol):
    provider: str

    def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 300,
        temperature: float = 0.4,
        json_mode: bool = False,
        images: list[ImageInput] | None = None,
        timeout: float = 20.0,
    ) -> str: ...


class GeminiClient:
    provider = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self.model = model

    def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 300,
        temperature: float = 0.4,
        json_mode: bool = False,
        images: list[ImageInput] | None = None,
        timeout: float = 20.0,
    ) -> str:
        parts: list[dict] = [{"text": user}]
        for image in images or []:
            parts.append({"inline_data": {"mime_type": image.mime_type, "data": image.data_base64}})

        generation_config: dict = {"temperature": temperature, "maxOutputTokens": max_tokens}
        if json_mode:
            generation_config["responseMimeType"] = "application/json"
        if self.model.startswith("gemini-2.5"):
            # 짧은 육아 문장에는 thinking이 필요 없고, 출력 토큰 예산을 답변에 모두 쓰게 한다.
            generation_config["thinkingConfig"] = {"thinkingBudget": 0}

        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": generation_config,
        }
        try:
            response = httpx.post(
                GEMINI_ENDPOINT.format(model=self.model),
                headers={"x-goog-api-key": self._api_key, "Content-Type": "application/json"},
                json=body,
                timeout=timeout,
            )
        except httpx.HTTPError as exc:
            raise LlmError(f"Gemini request failed: {exc}") from exc

        if response.status_code >= 400:
            raise LlmError(f"Gemini API error {response.status_code}: {response.text[:300]}")

        return _extract_gemini_text(response.json())


def _extract_gemini_text(data: dict) -> str:
    candidates = data.get("candidates") or []
    if not candidates:
        reason = (data.get("promptFeedback") or {}).get("blockReason", "no candidates")
        raise LlmError(f"Gemini returned no content: {reason}")
    candidate = candidates[0]
    parts = (candidate.get("content") or {}).get("parts") or []
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise LlmError(f"Gemini returned empty text: {candidate.get('finishReason', 'unknown')}")
    return text


class OpenAiClient:
    provider = "openai"

    def __init__(self, api_key: str, model: str) -> None:
        from openai import OpenAI  # 선택 의존성처럼 다루기 위해 지연 임포트

        self._client = OpenAI(api_key=api_key)
        self.model = model

    def complete(
        self,
        *,
        system: str,
        user: str,
        max_tokens: int = 300,
        temperature: float = 0.4,
        json_mode: bool = False,
        images: list[ImageInput] | None = None,
        timeout: float = 20.0,
    ) -> str:
        from openai import OpenAIError

        user_content: str | list[dict]
        if images:
            user_content = [{"type": "text", "text": user}] + [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image.mime_type};base64,{image.data_base64}", "detail": "low"},
                }
                for image in images
            ]
        else:
            user_content = user
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user_content}],
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout,
                **({"response_format": {"type": "json_object"}} if json_mode else {}),
            )
        except OpenAIError as exc:
            raise LlmError(f"OpenAI request failed: {exc}") from exc
        content = response.choices[0].message.content
        if not content or not content.strip():
            raise LlmError("OpenAI returned empty content")
        return content.strip()


def get_llm_client() -> LlmClient | None:
    provider = (settings.AI_PROVIDER or "auto").strip().lower()
    if provider == "none":
        return None
    if provider in {"auto", "gemini"} and settings.GEMINI_API_KEY:
        return GeminiClient(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
    if provider in {"auto", "openai"} and settings.OPENAI_API_KEY:
        return OpenAiClient(settings.OPENAI_API_KEY, settings.AI_MODEL)
    return None


def load_image(url: str) -> ImageInput | None:
    """자체 업로드(/uploads/파일명)는 디스크에서, 외부 http(s) URL은 내려받아 base64로 만든다.

    경로 조작이나 지원하지 않는 형식이면 None을 돌려주고 호출부가 fallback한다.
    """
    parsed = urlparse(url)
    if "/uploads/" in parsed.path:
        filename = Path(parsed.path).name
        if not filename or "/" in filename or "\\" in filename or filename.startswith("."):
            return None
        file_path = Path(settings.UPLOAD_DIR) / filename
        if not file_path.is_file() or file_path.stat().st_size > MAX_IMAGE_BYTES:
            return None
        mime = mimetypes.guess_type(file_path.name)[0] or "image/jpeg"
        return ImageInput(mime_type=mime, data_base64=base64.b64encode(file_path.read_bytes()).decode())

    if parsed.scheme not in {"http", "https"}:
        return None
    try:
        response = httpx.get(url, timeout=10.0, follow_redirects=True)
    except httpx.HTTPError:
        logger.warning("Failed to download image for analysis: %s", url)
        return None
    mime = (response.headers.get("content-type") or "").split(";")[0].strip()
    if response.status_code >= 400 or mime not in ALLOWED_IMAGE_MIME or len(response.content) > MAX_IMAGE_BYTES:
        return None
    return ImageInput(mime_type=mime, data_base64=base64.b64encode(response.content).decode())
