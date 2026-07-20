import { apiRequest } from "@/services/api/apiClient";
import { Platform } from "react-native";

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
  const formData = new FormData();
  const part = filePart(image);
  if (Platform.OS === "web") {
    const blob = await fetch(image.uri).then((response) => response.blob());
    formData.append("file", blob, part.name);
  } else {
    formData.append("file", part as unknown as Blob);
  }

  const { data } = await apiRequest<{ url: string }>("/uploads/images", {
    method: "POST",
    accessToken,
    body: formData,
    timeoutMs: 30000
  });
  return data.url;
}

export async function uploadImages(accessToken: string, images: LocalImage[]): Promise<string[]> {
  return Promise.all(images.map((image) => uploadImage(accessToken, image)));
}
