import { NeoInput } from "@/components/ui/neo-input";
import { Colors, Spacing } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "Makan & Minum",
    icons: ["food-apple-outline", "coffee-outline", "silverware-fork-knife", "cake-variant-outline", "cup-outline", "ice-cream"],
  },
  {
    label: "Transportasi",
    icons: ["car-outline", "bus", "train", "airplane", "bicycle", "moped-outline"],
  },
  {
    label: "Belanja",
    icons: ["cart-outline", "shopping-outline", "gift-outline", "bag-personal-outline", "purse-outline", "tag-outline"],
  },
  {
    label: "Hiburan",
    icons: ["gamepad-variant-outline", "movie-outline", "music-note-outline", "ticket-outline", "party-popper"],
  },
  {
    label: "Rumah & Utilitas",
    icons: ["home-outline", "wifi", "water-outline", "lightning-bolt-outline", "gas-station-outline", "lightbulb-outline"],
  },
  {
    label: "Kesehatan",
    icons: ["hospital-box-outline", "doctor", "medication", "tooth-outline", "heart-outline", "needle"],
  },
  {
    label: "Pendidikan",
    icons: ["school-outline", "book-outline", "laptop", "pencil-outline", "library-outline", "notebook-outline"],
  },
  {
    label: "Keuangan",
    icons: ["bank-outline", "piggy-bank-outline", "chart-line", "wallet-outline", "hand-coin-outline", "currency-usd", "cash", "credit-card-outline", "receipt"],
  },
  {
    label: "Ponsel & Teknologi",
    icons: ["phone-outline", "cellphone", "tablet", "monitor", "printer-outline", "camera-outline"],
  },
  {
    label: "Pakaian",
    icons: ["tshirt-crew-outline", "shoe-sneaker", "watch-variant", "glasses", "ring"],
  },
  {
    label: "Lainnya",
    icons: ["tools", "briefcase-outline", "dog", "cat", "flower-outline", "earth", "account-outline", "shape-outline"],
  },
];

const COLORS = ["#FFD200", "#01CA47", "#FF6060", "#52E8ED", "#FF9D00", "#D026E3"];

type EditData = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type Props = {
  visible: boolean;
  type: "pengeluaran" | "pemasukan";
  editData: EditData | null;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; icon: string; color: string; type: "pengeluaran" | "pemasukan" }) => Promise<void>;
};

export function AddNewCategory({ visible, type, editData, onClose, onSave }: Props) {
  const [name, setName] = useState(editData?.name ?? "");
  const [icon, setIcon] = useState(editData?.icon ?? "shape-outline");
  const [color, setColor] = useState(editData?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const { width, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const iconSize = Math.floor((width - Spacing.pageX * 2 - Spacing.three * 5) / 6);

  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      setName(editData?.name ?? "");
      setIcon(editData?.icon ?? "shape-outline");
      setColor(editData?.color ?? COLORS[0]);
      sheetTranslateY.setValue(screenHeight);
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    }
  }, [visible, editData, screenHeight, sheetTranslateY]);

  const handleSwipeMove = useCallback(
    (dy: number) => {
      if (dy > 0) {
        sheetTranslateY.setValue(dy);
      }
    },
    [sheetTranslateY],
  );

  const handleSwipeRelease = useCallback(
    (dy: number, vy: number) => {
      const threshold = 100;
      if (dy > threshold || vy > 0.5) {
        Animated.timing(sheetTranslateY, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }).start();
      }
    },
    [onClose, sheetTranslateY, screenHeight],
  );

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => handleSwipeMove(gs.dy),
      onPanResponderRelease: (_, gs) => handleSwipeRelease(gs.dy, gs.vy),
    }),
  ).current;

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gs) => handleSwipeMove(gs.dy),
      onPanResponderRelease: (_, gs) => handleSwipeRelease(gs.dy, gs.vy),
    }),
  ).current;

  const handleClose = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: screenHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, sheetTranslateY, screenHeight]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editData?.id,
        name: name.trim(),
        icon,
        color,
        type,
      });
      setSaving(false);
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const sheetContent = (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }], paddingBottom: insets.bottom + Spacing.four }]} {...sheetPanResponder.panHandlers}>
      <View style={styles.handleArea} {...handlePanResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.title}>{editData ? "Edit Kategori" : "Tambah Kategori"}</Text>
        <Text style={[styles.typeLabel, { color: type === "pengeluaran" ? Colors.danger : Colors.success }]}>{type === "pengeluaran" ? "Pengeluaran" : "Pemasukan"}</Text>
      </View>

      <NeoInput placeholder="nama kategori..." value={name} onChangeText={setName} autoCapitalize="sentences" />

      <Text style={styles.sectionTitle}>Pilih Warna</Text>
      <View style={styles.colorGrid}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.colorItem, { backgroundColor: c }, color === c && styles.colorItemSelected]} onPress={() => setColor(c)} activeOpacity={0.7}>
            {color === c && <MaterialCommunityIcons name="check" size={18} color={Colors.white} />}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Pilih Icon</Text>
      <ScrollView style={styles.iconScrollContainer} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {ICON_GROUPS.map((group) => (
          <View key={group.label} style={styles.iconGroup}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.iconRow}>
              {group.icons.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[styles.iconItem, { width: iconSize, height: iconSize }, icon === iconName && { backgroundColor: color, borderColor: Colors.black }]}
                  onPress={() => setIcon(iconName)}
                  activeOpacity={0.7}
                >
<MaterialCommunityIcons
                    name={iconName as any}
                    size={iconSize * 0.55}
                    color={icon === iconName ? Colors.white : Colors.black}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.saveBtnOuter}>
        {(!name.trim() || saving) ? null : <View style={styles.saveBtnShadow} pointerEvents="none" />}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: (!name.trim() || saving) ? Colors.gray : (type === "pengeluaran" ? Colors.danger : Colors.success) },
            pressed && !(!name.trim() || saving) && styles.saveBtnPressed,
          ]}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          <Text style={styles.saveBtnText}>{saving ? "Menyimpan..." : "Gaskeun"}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  if (!visible) return null;

  return Platform.OS === "android" ? (
    <View style={styles.overlayAbsolute}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      {sheetContent}
    </View>
  ) : (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>{sheetContent}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderColor: Colors.black,
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.two,
    maxHeight: "100%",
  },
  handleArea: {
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  handle: {
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.black,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.black,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
    marginTop: 16,
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 22,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: Colors.black,
  },
  iconScrollContainer: {
    maxHeight: 350,
    marginBottom: 8,
    marginHorizontal: -Spacing.pageX,
    paddingHorizontal: Spacing.pageX,
  },
  iconGroup: {
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.gray,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  iconRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  iconItem: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  saveBtnOuter: {
    position: "relative",
    paddingRight: 3,
    paddingBottom: 3,
    marginTop: Spacing.two,
  },
  saveBtnShadow: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: "center",
  },
  saveBtnPressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
});
