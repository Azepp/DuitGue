import { Platform, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants/theme";

type UpdateModalProps = {
  visible: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  onClose: () => void;
};

export function UpdateModal({
  visible,
  latestVersion,
  downloadUrl,
  releaseNotes,
  onClose,
}: UpdateModalProps) {
  const handleDownload = () => {
    Linking.openURL(downloadUrl);
  };

  const notes = releaseNotes
    ? releaseNotes.split("\n").filter(Boolean).slice(0, 5)
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="cellphone-arrow-down" size={36} color={Colors.black} />
          </View>

          <Text style={styles.title}>Update Tersedia!</Text>
          <Text style={styles.subtitle}>
            Versi terbaru: <Text style={{ fontWeight: "700" }}>v{latestVersion}</Text>
          </Text>

          {notes.length > 0 && (
            <View style={styles.notesWrap}>
              <Text style={styles.notesLabel}>Apa yang baru:</Text>
              {notes.map((line, i) => (
                <Text key={i} style={styles.noteLine}>
                  • {line.replace(/^[-*]\s*/, "")}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.laterBtnText}>Nanti aja</Text>
            </TouchableOpacity>

            <View style={styles.downloadShadowWrap}>
              <View style={styles.downloadShadowFill} pointerEvents="none" />
              <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8}>
                <MaterialCommunityIcons name="download" size={20} color={Colors.black} />
                <Text style={styles.downloadBtnText}>Download</Text>
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
    width: 320,
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
    fontWeight: "700",
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
    marginBottom: Spacing.three,
  },
  notesWrap: {
    width: "100%",
    backgroundColor: Colors.grayLight,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  noteLine: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.black,
    lineHeight: 18,
    marginBottom: 2,
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
    fontSize: 15,
    fontWeight: "700",
    color: Colors.black,
  },
  downloadShadowWrap: {
    flex: 1,
    paddingRight: 4,
    paddingBottom: 4,
  },
  downloadShadowFill: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  downloadBtn: {
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
  downloadBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.black,
  },
});
