import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "@/shared/constants/colors";

export interface RecordPhoto {
  uri: string;
  description: string;
}

interface PhotoPickerProps {
  photos: RecordPhoto[];
  onAdd: (uri: string) => void;
  onRemove: (uri: string) => void;
  onDescriptionChange: (uri: string, description: string) => void;
  maxPhotos?: number;
}

export function PhotoPicker({ photos, onAdd, onRemove, onDescriptionChange, maxPhotos = 3 }: PhotoPickerProps) {
  const canAddMore = photos.length < maxPhotos;

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

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>오늘 사진</Text>
        <Text style={styles.counter}>{photos.length}/{maxPhotos}</Text>
      </View>

      {photos.length === 0 ? (
        <Pressable style={styles.emptyBox} onPress={pickPhoto}>
          <ImagePlus color={colors.primary} size={28} />
          <Text style={styles.emptyText}>사진을 추가해 보세요</Text>
        </Pressable>
      ) : (
        <View style={styles.photoList}>
          {photos.map((photo) => (
            <View key={photo.uri} style={styles.photoCard}>
              <View style={styles.photoImageWrap}>
                <Image resizeMode="cover" source={{ uri: photo.uri }} style={styles.photoImage} />
                <Pressable style={styles.removeButton} onPress={() => onRemove(photo.uri)}>
                  <X color="#FFFFFF" size={14} />
                </Pressable>
              </View>
              <TextInput
                maxLength={80}
                onChangeText={(text) => onDescriptionChange(photo.uri, text)}
                placeholder="사진 설명 (선택)"
                placeholderTextColor={colors.textMuted}
                style={styles.descriptionInput}
                value={photo.description}
              />
            </View>
          ))}
          {canAddMore && (
            <Pressable style={styles.addMoreBox} onPress={pickPhoto}>
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
  emptyBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 6,
    justifyContent: "center",
    paddingVertical: 24
  },
  emptyText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  photoList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  photoCard: {
    gap: 6,
    width: 104
  },
  photoImageWrap: {
    position: "relative"
  },
  photoImage: {
    borderRadius: 16,
    height: 104,
    width: 104
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
  descriptionInput: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 104,
    justifyContent: "center",
    width: 104
  }
});
