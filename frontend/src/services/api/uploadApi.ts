import { File, UploadType } from "expo-file-system";
import { Platform } from "react-native";

import { env } from "@/config/env";
import { ApiRequestError, apiRequest, fetchWithAuth, resolveAccessToken } from "@/services/api/apiClient";

const MIME_BY_EXTENSION: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

export interface LocalImage {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

function filePart(image: LocalImage) {
  const cleanUri = image.uri.split("?")[0];
  const candidate = cleanUri.split(".").pop()?.toLowerCase();
  const extension = candidate && MIME_BY_EXTENSION[candidate] ? candidate : "jpg";
  const type = image.mimeType ?? MIME_BY_EXTENSION[extension] ?? "image/jpeg";
  const name = image.fileName ?? `image-${Date.now()}.${extension}`;

  return { uri: image.uri, name, type };
}

export async function uploadImage(accessToken: string, image: LocalImage): Promise<string> {
  const part = filePart(image);
  if (Platform.OS === "web") {
    const formData = new FormData();
    const blob = await fetch(image.uri).then((response) => response.blob());
    formData.append("file", blob, part.name);
    const { data } = await apiRequest<{ url: string }>("/uploads/images", {
      method: "POST",
      accessToken,
      body: formData,
      timeoutMs: 30000
    });
    return data.url;
  }

  const file = new File(image.uri);
  const upload = async (token: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      return await file.upload(`${env.apiBaseUrl}/uploads/images`, {
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        mimeType: part.type,
        headers: { Authorization: `Bearer ${token}` },
        sessionType: "foreground",
        signal: controller.signal
      });
    } catch (error) {
      if (__DEV__) console.warn("Native photo upload failed", error instanceof Error ? error.message : String(error));
      throw new ApiRequestError(controller.signal.aborted ? "timeout" : "network", "사진 전송에 실패했어요. 다시 시도해 주세요.");
    } finally {
      clearTimeout(timeout);
    }
  };

  let result = await upload(resolveAccessToken(accessToken));
  if (result.status === 401) {
    const refreshed = await fetchWithAuth(`${env.apiBaseUrl}/users/me`, { method: "GET" }, accessToken);
    if (!refreshed.ok) throw new ApiRequestError("auth", "로그인이 만료되었습니다.");
    result = await upload(resolveAccessToken(accessToken));
  }
  if (result.status === 413) throw new ApiRequestError("validation", "사진 크기는 10MB 이하여야 해요.");
  if (result.status === 415 || result.status === 422) throw new ApiRequestError("validation", "이 사진 형식은 업로드할 수 없어요.");
  if (result.status >= 500) throw new ApiRequestError("server", "사진 서버에 문제가 있어요.");
  if (result.status < 200 || result.status >= 300) throw new ApiRequestError("network", "사진 전송에 실패했어요.");
  try {
    const payload = JSON.parse(result.body) as { data?: { url?: string } };
    if (typeof payload.data?.url === "string") return payload.data.url;
  } catch {
    // 응답 검증 오류는 아래에서 하나의 메시지로 처리한다.
  }
  throw new ApiRequestError("malformed", "사진 업로드 응답을 확인할 수 없어요.");
}

export async function uploadImages(accessToken: string, images: LocalImage[]): Promise<string[]> {
  return Promise.all(images.map((image) => uploadImage(accessToken, image)));
}
