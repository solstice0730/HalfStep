import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { DiaryPhotoDraft } from "@/features/diary/types/diary";
import { colors } from "@/shared/constants/colors";

interface PhotoPickerProps {
  photos: DiaryPhotoDraft[];
  onAdd: (uri: string) => void;
  onRemove: (uri: string) => void;
  onDescriptionChange: (uri: string, description: string) => void;
  maxPhotos?: number;
}

// 오늘 사진: 썸네일에 시각 배지와 장면 캡션 칩을 붙인다.
export function PhotoPicker({ photos, onAdd, onRemove, onDescriptionChange, maxPhotos = 3 }: PhotoPickerProps) {
  const [editingUri, setEditingUri] = useState<string | null>(null);
  const canAddMore = photos.length < maxPhotos;
  const readyCount = photos.filter((photo) => photo.status === "ready").length;
  const busy = photos.some((photo) => photo.status === "uploading" || photo.status === "analyzing");

  const pickPhoto = async () => {
    if (!canAddMore) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9
    });

    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) onAdd(uri);
    }
  };

  const statusLabel = busy
    ? "사진 정리 중…"
    : photos.length > 0
      ? `${readyCount}장 준비됐어요`
      : `${photos.length}/${maxPhotos}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>오늘 사진</Text>
        <View style={styles.statusRow}>
          {busy && <ActivityIndicator color={colors.primary} size="small" />}
          <Text style={[styles.counter, photos.length > 0 && styles.counterReady]}>{statusLabel}</Text>
        </View>
      </View>

      {photos.length === 0 ? (
        <Pressable style={styles.emptyBox} onPress={pickPhoto}>
          <ImagePlus color={colors.primary} size={28} />
          <Text style={styles.emptyText}>사진을 추가해 보세요</Text>
          <Text style={styles.emptyHint}>오늘의 순간을 일기에 함께 담아요</Text>
        </Pressable>
      ) : (
        <View style={styles.photoList}>
          {photos.map((photo) => {
            const caption = photo.description.trim() || photo.caption;
            const isEditing = editingUri === photo.uri;
            return (
              <View key={photo.uri} style={styles.photoCard}>
                <View style={styles.photoImageWrap}>
                  <Image resizeMode="cover" source={{ uri: photo.uri }} style={styles.photoImage} />
                  <Text style={styles.timeBadge}>{photo.addedAt}</Text>
                  {(photo.status === "uploading" || photo.status === "analyzing") && (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    </View>
                  )}
                  <Pressable accessibilityLabel="사진 삭제" style={styles.removeButton} onPress={() => onRemove(photo.uri)}>
                    <X color="#FFFFFF" size={14} />
                  </Pressable>
                </View>
                {isEditing ? (
                  <TextInput
                    autoFocus
                    maxLength={80}
                    onBlur={() => setEditingUri(null)}
                    onChangeText={(text) => onDescriptionChange(photo.uri, text)}
                    placeholder="사진 설명"
                    placeholderTextColor={colors.textMuted}
                    style={styles.descriptionInput}
                    value={photo.description}
                  />
                ) : (
                  <Pressable accessibilityLabel="사진 설명 편집" onPress={() => setEditingUri(photo.uri)}>
                    <Text numberOfLines={1} style={[styles.captionChip, !caption && styles.captionChipMuted]}>
                      {caption ?? (photo.status === "error" ? "설명 추가" : "준비 중")}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {canAddMore && (
            <Pressable accessibilityLabel="사진 추가" style={styles.addMoreBox} onPress={pickPhoto}>
              <ImagePlus color={colors.primary} size={22} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  counter: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  counterReady: {
    color: colors.primary,
    fontWeight: "800"
  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 4,
    justifyContent: "center",
    paddingVertical: 22
  },
  emptyText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 11
  },
  photoList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  photoCard: {
    gap: 6,
    width: 100
  },
  photoImageWrap: {
    position: "relative"
  },
  photoImage: {
    borderRadius: 16,
    height: 100,
    width: 100
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(32,26,23,0.35)",
    borderRadius: 16,
    justifyContent: "center"
  },
  timeBadge: {
    backgroundColor: "rgba(32,26,23,0.55)",
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    left: 6,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 6
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: "rgba(45,37,32,0.6)",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 22
  },
  captionChip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center"
  },
  captionChipMuted: {
    backgroundColor: "rgba(255,255,255,0.6)",
    color: colors.textMuted
  },
  descriptionInput: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  addMoreBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 100,
    justifyContent: "center",
    width: 100
  }
});
