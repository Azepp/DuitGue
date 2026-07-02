import { ActivityIndicator, TouchableOpacity, View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Fonts, Spacing } from "@/constants/theme";

type OTAUpdateBannerProps = {
  visible: boolean;
  isDownloading: boolean;
  onApply: () => void;
};

export function OTAUpdateBanner({ visible, isDownloading, onApply }: OTAUpdateBannerProps) {
  if (!visible && !isDownloading) return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onApply}
      activeOpacity={0.8}
      disabled={isDownloading}
    >
      <View style={styles.iconWrap}>
        {isDownloading ? (
          <ActivityIndicator size="small" color={Colors.black} />
        ) : (
          <MaterialCommunityIcons name="cellphone-arrow-down" size={18} color={Colors.black} />
        )}
      </View>
      <ThemedText style={styles.text}>
        {isDownloading ? "Mengunduh update..." : "Update siap! Tekan buat restart"}
      </ThemedText>
      {!isDownloading && (
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.black} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderBottomWidth: 3,
    borderColor: Colors.black,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
  },
  iconWrap: {
    width: 24,
    alignItems: "center",
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
