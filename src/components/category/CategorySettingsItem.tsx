import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View, StyleSheet, type GestureResponderEvent } from "react-native";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { ThemedText } from "@/components/themed-text";

export type CategoryItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "pengeluaran" | "pemasukan";
  created_at?: string;
};

type Props = {
  item: CategoryItem;
  onDelete: (id: string) => void;
  onEdit: (item: CategoryItem) => void;
  isDragged: boolean;
  onDragStart: (pageY: number) => void;
  onDragMove: (pageY: number) => void;
  onDragEnd: () => void;
};

function ActionButton({ bg, icon, onPress }: { bg: string; icon: string; onPress: () => void }) {
  return (
    <View style={styles.btnWrapper}>
      <View style={styles.btnShadow} pointerEvents="none" />
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: bg }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name={icon as any} size={20} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

export function CategorySettingsItem({ item, onDelete, onEdit, isDragged, onDragStart, onDragMove, onDragEnd }: Props) {
  return (
    <View style={styles.row}>
      <ActionButton bg={Colors.danger} icon="minus" onPress={() => onDelete(item.id)} />

      <View style={styles.cardWrapper}>
        <View style={styles.cardShadow} pointerEvents="none" />
        <View style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: item.color }]}>
            <MaterialCommunityIcons
              name={item.icon as any}
              size={22}
              color={Colors.white}
            />
          </View>
          <ThemedText type="default" style={styles.name} numberOfLines={1}>
            {item.name}
          </ThemedText>
        </View>
      </View>

      <ActionButton bg={Colors.blue} icon="pencil-outline" onPress={() => onEdit(item)} />

      <View style={styles.btnWrapper}>
        <View style={styles.btnShadow} pointerEvents="none" />
        <View
          style={[styles.actionBtn, { backgroundColor: isDragged ? Colors.gray : Colors.success }]}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e: GestureResponderEvent) => onDragStart(e.nativeEvent.pageY)}
          onResponderMove={(e: GestureResponderEvent) => onDragMove(e.nativeEvent.pageY)}
          onResponderRelease={onDragEnd}
        >
          <MaterialCommunityIcons name="dots-grid" size={20} color={Colors.white} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: Spacing.pageX,
    marginBottom: Spacing.two,
  },
  btnWrapper: {
    paddingRight: 2,
    paddingBottom: 2,
  },
  btnShadow: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    flex: 1,
    paddingRight: 3,
    paddingBottom: 3,
  },
  cardShadow: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.white,
    padding: Spacing.twoHalf,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    flex: 1,
    fontFamily: Fonts.semiBold,
  },
});
