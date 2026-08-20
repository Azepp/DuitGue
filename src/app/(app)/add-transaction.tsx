import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, FlatList, PanResponder, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { AddModalProvider, useAddModal, type TransactionData } from "@/components/transaction/AddModal";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { offlineInsert, offlineUpdate, cacheQueryData, getCachedData } from "@/lib/offline";
import { generateId } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "pengeluaran" | "pemasukan";
};

type EditTxData = {
  id: string;
  category_id: string;
  amount: number;
  type: "pengeluaran" | "pemasukan";
  note: string | null;
  date: string;
  categories: { id: string; name: string; icon: string; color: string; type: string } | null;
};

function AddTransactionContent() {
  const session = useAuthStore((s) => s.session);
  const { type: routeType, edit: editTxId } = useLocalSearchParams<{ type?: string; edit?: string }>();
  const initialType = routeType?.toString() === "pemasukan" ? "pemasukan" : "pengeluaran";
  const [selectedType, setSelectedType] = useState<"pengeluaran" | "pemasukan">(initialType);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = (screenWidth - Spacing.pageX * 2 - Spacing.two * 3) / 4;

  const addModal = useAddModal();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const selectedTypeRef = useRef(selectedType);
  selectedTypeRef.current = selectedType;

  const fetchCategories = useCallback(
    async (type: "pengeluaran" | "pemasukan") => {
      if (!session?.user.id) return [];
      const { data } = await supabase.from("categories").select("*").eq("user_id", session.user.id).eq("type", type).order("name");
      return (data ?? []) as Category[];
    },
    [session?.user.id],
  );

  const { data: pengeluaranCategories } = useQuery({
    queryKey: ["categories", "pengeluaran", session?.user.id],
    queryFn: async () => {
      const result = await fetchCategories("pengeluaran");
      if (result.length > 0) cacheQueryData("categories", result);
      return result;
    },
    enabled: !!session?.user.id,
    placeholderData: () => {
      const cached = getCachedData<Category>("categories");
      return cached.filter((c) => c.type === "pengeluaran");
    },
  });

  const { data: pemasukanCategories } = useQuery({
    queryKey: ["categories", "pemasukan", session?.user.id],
    queryFn: async () => {
      const result = await fetchCategories("pemasukan");
      if (result.length > 0) cacheQueryData("categories", result);
      return result;
    },
    enabled: !!session?.user.id,
    placeholderData: () => {
      const cached = getCachedData<Category>("categories");
      return cached.filter((c) => c.type === "pemasukan");
    },
  });

  const { data: editTransaction } = useQuery({
    queryKey: ["transaction", editTxId, session?.user.id],
    queryFn: async () => {
      if (!editTxId || !session?.user.id) return null;
      const { data } = await supabase
        .from("transactions")
        .select("*, categories(name, icon, color)")
        .eq("id", editTxId)
        .single();
      return data as EditTxData | null;
    },
    enabled: !!editTxId && !!session?.user.id,
  });

  const [syncedEditType, setSyncedEditType] = useState<"pengeluaran" | "pemasukan" | null>(null);

  if (editTransaction?.type && editTransaction.type !== syncedEditType) {
    setSyncedEditType(editTransaction.type);
    setSelectedType(editTransaction.type);
  }

  const hasOpened = useRef(false);
  const editTxRef = useRef<{ id: string; amount: number; note: string; date: string } | null>(null);

  useEffect(() => {
    if (editTransaction && (pengeluaranCategories || pemasukanCategories) && !hasOpened.current) {
      const allCats = [...(pengeluaranCategories ?? []), ...(pemasukanCategories ?? [])];
      const cat = allCats.find((c) => c.id === editTransaction.category_id);
      if (cat) {
        hasOpened.current = true;
        const editData = {
          id: editTransaction.id,
          amount: editTransaction.amount,
          note: editTransaction.note ?? "",
          date: editTransaction.date,
        };
        editTxRef.current = editData;
        addModal.open(cat, editData);
      }
    }
  }, [editTransaction, pengeluaranCategories, pemasukanCategories]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectedType === "pengeluaran" ? 0 : -screenWidth,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selectedType, screenWidth, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 15,
      onPanResponderMove: (_, gs) => {
        const baseOffset = selectedTypeRef.current === "pengeluaran" ? 0 : -screenWidth;
        slideAnim.setValue(Math.min(0, Math.max(-screenWidth, baseOffset + gs.dx)));
      },
      onPanResponderRelease: (_, gs) => {
        const threshold = 50;
        const current = selectedTypeRef.current;
        if (current === "pengeluaran" && gs.dx < -threshold) {
          setSelectedType("pemasukan");
        } else if (current === "pemasukan" && gs.dx > threshold) {
          setSelectedType("pengeluaran");
        } else {
          Animated.timing(slideAnim, {
            toValue: current === "pengeluaran" ? 0 : -screenWidth,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleCategoryPress = useCallback(
    (category: Category) => {
      addModal.open(category, editTxRef.current ?? undefined);
    },
    [addModal],
  );

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <View style={[styles.categoryItem, { width: itemWidth }]}>
        <View style={styles.categoryIconWrapper}>
          <View style={styles.categoryShadow} pointerEvents="none" />
          <TouchableOpacity style={[styles.categoryIcon, { backgroundColor: item.color }]} onPress={() => handleCategoryPress(item)} activeOpacity={0.8}>
            <MaterialCommunityIcons name={item.icon as any} size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <ThemedText style={styles.categoryLabel} numberOfLines={1}>
          {item.name}
        </ThemedText>
      </View>
    ),
    [handleCategoryPress],
  );

  const renderGrid = useCallback(
    (data: Category[] | undefined, type: string) => (
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        numColumns={4}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 80 }]}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="shape-outline" size={48} color={Colors.gray} />
            <ThemedText style={styles.emptyText}>Belum ada kategori {type}</ThemedText>
          </View>
        }
      />
    ),
    [insets.bottom, renderCategory],
  );

  const handleTogglePengeluaran = useCallback(() => setSelectedType("pengeluaran"), []);
  const handleTogglePemasukan = useCallback(() => setSelectedType("pemasukan"), []);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <View style={[styles.headerBar, { paddingTop: 12 + insets.top }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <ThemedText style={styles.gajadiText}>Gajadi</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>{editTxId ? "Edit Catatan" : "Tambahkan Catatan"}</ThemedText>
            </View>
          ),
        }}
      />

      <View style={styles.toggleBar}>
        <View style={styles.toggleWrapper}>
          <View style={styles.toggleShadow} pointerEvents="none" />
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleChip, styles.toggleChipLeft, selectedType === "pengeluaran" && { backgroundColor: Colors.danger }]} onPress={handleTogglePengeluaran} activeOpacity={0.8}>
              <ThemedText style={[styles.toggleText, selectedType === "pengeluaran" && styles.toggleTextActive]}>Pengeluaran</ThemedText>
            </TouchableOpacity>
            <View style={styles.toggleDivider} />
            <TouchableOpacity style={[styles.toggleChip, styles.toggleChipRight, selectedType === "pemasukan" && { backgroundColor: Colors.success }]} onPress={handleTogglePemasukan} activeOpacity={0.8}>
              <ThemedText style={[styles.toggleText, selectedType === "pemasukan" && styles.toggleTextActive]}>Pemasukan</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.swipeArea} {...panResponder.panHandlers}>
        <Animated.View style={[styles.slideContainer, { width: screenWidth * 2, transform: [{ translateX: slideAnim }] }]}>
          <View style={{ width: screenWidth, flex: 1 }}>
            {renderGrid(pengeluaranCategories, "pengeluaran")}
          </View>
          <View style={{ width: screenWidth, flex: 1 }}>
            {renderGrid(pemasukanCategories, "pemasukan")}
          </View>
        </Animated.View>
      </View>

      <TouchableOpacity style={[styles.aturBtn, { bottom: insets.bottom + Spacing.four }]} onPress={() => {
        const userId = session?.user.id;
        if (userId) {
          queryClient.prefetchQuery({
            queryKey: ["categories", "pengeluaran", userId],
            queryFn: async () => {
              const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("type", "pengeluaran").order("created_at");
              return data ?? [];
            },
          });
          queryClient.prefetchQuery({
            queryKey: ["categories", "pemasukan", userId],
            queryFn: async () => {
              const { data } = await supabase.from("categories").select("*").eq("user_id", userId).eq("type", "pemasukan").order("created_at");
              return data ?? [];
            },
          });
        }
        router.push("/category-settings");
      }}>
        <MaterialCommunityIcons name="cog-outline" size={18} color={Colors.black} />
        <ThemedText style={styles.aturBtnText}>Atur</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

function AddTransactionProvider() {
  const { showToast } = useToast();
  const session = useAuthStore((s) => s.session);

  const handleSubmit = useCallback(
    async (data: TransactionData) => {
      if (!session?.user.id) return;

      const now = new Date();
      const txId = data.id || generateId();
      const txItem = {
        id: txId,
        user_id: session.user.id,
        category_id: data.category_id,
        amount: data.amount,
        type: data.type,
        note: data.note || null,
        date: data.date,
        created_at: now.toISOString(),
      };

      if (data.id) {
        await offlineUpdate("transactions", txItem as any, ["transactions"]);
      } else {
        await offlineInsert("transactions", txItem as any, ["transactions"]);
      }

      showToast("Catatan berhasil disimpan!");
      router.back();
    },
    [session?.user.id, showToast],
  );

  return (
    <AddModalProvider onSubmit={handleSubmit}>
      <AddTransactionContent />
    </AddModalProvider>
  );
}

export default function AddTransactionScreen() {
  return <AddTransactionProvider />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  toggleBar: {
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.twoHalf,
    marginBottom: Spacing.three,
  },
  toggleWrapper: {
    paddingRight: 4,
    paddingBottom: 4,
  },
  toggleShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  toggleContainer: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  toggleChip: {
    flex: 1,
    paddingVertical: Spacing.twoHalf,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  toggleChipLeft: {},
  toggleChipRight: {},
  toggleDivider: {
    width: 3,
    backgroundColor: Colors.black,
  },
  toggleText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  swipeArea: {
    flex: 1,
    overflow: "hidden",
  },
  slideContainer: {
    flexDirection: "row",
    flex: 1,
  },
  grid: {
    paddingHorizontal: Spacing.pageX,
    paddingBottom: 80,
  },
  gridRow: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
    justifyContent: "flex-start",
  },
  categoryItem: {
    alignItems: "center",
  },
  categoryIconWrapper: {
    width: 47,
    height: 47,
  },
  categoryShadow: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.black,
  },
  categoryIcon: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.gray,
    marginTop: Spacing.two,
  },
  aturBtn: {
    position: "absolute",
    bottom: Spacing.four,
    right: Spacing.pageX,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.white,
  },
  aturBtnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  gajadiText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    textDecorationLine: "underline",
  },
});
