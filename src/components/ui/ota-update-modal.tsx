import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Fonts, Spacing } from "@/constants/theme";

type OTAUpdateModalProps = {
  visible: boolean;
  isDownloading: boolean;
  onApply: () => void;
  onClose: () => void;
};

export function OTAUpdateModal({ visible, isDownloading, onApply, onClose }: OTAUpdateModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            {isDownloading ? (
              <MaterialCommunityIcons name="progress-download" size={36} color={Colors.black} />
            ) : (
              <MaterialCommunityIcons name="cellphone-arrow-down" size={36} color={Colors.black} />
            )}
          </View>

          <ThemedText style={styles.title}>Update Nyampe!</ThemedText>
          <ThemedText style={styles.subtitle}>
            Versi baru udah keunduh. Restart sekarang biar langsung kepake?
          </ThemedText>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.8}>
              <ThemedText style={styles.laterBtnText}>Nanti</ThemedText>
            </TouchableOpacity>

            <View style={styles.applyShadowWrap}>
              <View style={styles.applyShadowFill} pointerEvents="none" />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={onApply}
                activeOpacity={0.8}
                disabled={isDownloading}
              >
                <MaterialCommunityIcons name="restart" size={18} color={Colors.black} />
                <ThemedText style={styles.applyBtnText}>
                  {isDownloading ? "Mengunduh..." : "Restart"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    width: 340,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: Colors.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.black,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.twoHalf,
    width: "100%",
  },
  laterBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.three,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  laterBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  applyShadowWrap: {
    flex: 1,
    paddingRight: 4,
    paddingBottom: 4,
  },
  applyShadowFill: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  applyBtn: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.three,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.success,
  },
  applyBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});