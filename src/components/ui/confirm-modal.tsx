import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "primary" | "success";
  onConfirm: () => void;
  onCancel: () => void;
};

const variantColors = {
  danger: Colors.danger,
  primary: Colors.primary,
  success: Colors.success,
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Gajadi",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: variantColors[confirmVariant] }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
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
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  card: {
    width: 300,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: Spacing.two,
  },
  message: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.black,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.twoHalf,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
  },
  confirmBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});
