import { Platform, Linking, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Fonts, Spacing } from "@/constants/theme";

type UpdateModalProps = {
  visible: boolean;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  isForceUpdate: boolean;
  onClose: () => void;
};

export function UpdateModal({
  visible,
  latestVersion,
  downloadUrl,
  releaseNotes,
  isForceUpdate,
  onClose,
}: UpdateModalProps) {
  const handleDownload = () => {
    Linking.openURL(downloadUrl);
  };

  const notes = releaseNotes
    ? releaseNotes.split("\n").filter(Boolean).slice(0, 5)
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isForceUpdate ? undefined : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, isForceUpdate && { backgroundColor: Colors.danger }]}>
            <MaterialCommunityIcons
              name={isForceUpdate ? "alert-decagram" : "cellphone-arrow-down"}
              size={36}
              color={Colors.black}
            />
          </View>

          <ThemedText style={styles.title}>
            {isForceUpdate ? "Wajib Update!" : "Update Tersedia!"}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Versi terbaru: <ThemedText>v{latestVersion}</ThemedText>
          </ThemedText>

          {isForceUpdate && (
            <ThemedText style={styles.forceNote}>
              Versi ini udah gak didukung. Download versi terbaru buat lanjut pake DuitGue.
            </ThemedText>
          )}

          {notes.length > 0 && (
            <View style={styles.notesWrap}>
              <ThemedText style={styles.notesLabel}>Apa yang baru:</ThemedText>
              {notes.map((line, i) => (
                <ThemedText key={i} style={styles.noteLine}>
                  • {line.replace(/^[-*]\s*/, "")}
                </ThemedText>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            {!isForceUpdate && (
              <TouchableOpacity style={styles.laterBtn} onPress={onClose} activeOpacity={0.8}>
                <ThemedText style={styles.laterBtnText}>Nanti aja</ThemedText>
              </TouchableOpacity>
            )}

            <View style={[styles.downloadShadowWrap, isForceUpdate && { flex: 1 }]}>
              <View style={styles.downloadShadowFill} pointerEvents="none" />
              <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8}>
                <MaterialCommunityIcons name="download" size={20} color={Colors.black} />
                <ThemedText style={styles.downloadBtnText}>Download</ThemedText>
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
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
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
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  forceNote: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.danger,
    textAlign: "center",
    marginBottom: Spacing.three,
    lineHeight: 18,
  },
  noteLine: {
    fontSize: 12,
    fontFamily: Fonts.medium,
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
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
