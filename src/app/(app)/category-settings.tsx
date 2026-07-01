import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddNewCategory } from "@/components/category/AddNewCategory";
import { CategorySettingsItem, type CategoryItem } from "@/components/category/CategorySettingsItem";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";


function CategorySettingsContent() {
  const session = useAuthStore((s) => s.session);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedType, setSelectedType] = useState<"pengeluaran" | "pemasukan">("pengeluaran");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CategoryItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [pengeluaranItems, setPengeluaranItems] = useState<CategoryItem[]>([]);
  const [pemasukanItems, setPemasukanItems] = useState<CategoryItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedType, setDraggedType] = useState<"pengeluaran" | "pemasukan" | null>(null);

  const pengeluaranItemsRef = useRef(pengeluaranItems);
  pengeluaranItemsRef.current = pengeluaranItems;
  const pemasukanItemsRef = useRef(pemasukanItems);
  pemasukanItemsRef.current = pemasukanItems;
  const draggedIndexRef = useRef(draggedIndex);
  draggedIndexRef.current = draggedIndex;
  const draggedTypeRef = useRef(draggedType);
  draggedTypeRef.current = draggedType;
  const selectedTypeRef = useRef(selectedType);
  selectedTypeRef.current = selectedType;

  const dragOffset = useRef(new Animated.Value(0)).current;
  const dragScaleAnim = useRef(new Animated.Value(1)).current;
  const dragShadowAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);
  const itemLayouts = useRef<Record<number, number>>({});

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: selectedType === "pengeluaran" ? 0 : -screenWidth,
      duration: 300,
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

  const fetchCategories = useCallback(
    async (type: "pengeluaran" | "pemasukan") => {
      if (!session?.user.id) return [];
      const { data } = await supabase.from("categories").select("*").eq("user_id", session.user.id).eq("type", type).order("created_at");
      return (data ?? []) as CategoryItem[];
    },
    [session?.user.id],
  );

  const { data: pengeluaranList } = useQuery({
    queryKey: ["categories", "pengeluaran", session?.user.id],
    queryFn: () => fetchCategories("pengeluaran"),
    enabled: !!session?.user.id,
  });

  const { data: pemasukanList } = useQuery({
    queryKey: ["categories", "pemasukan", session?.user.id],
    queryFn: () => fetchCategories("pemasukan"),
    enabled: !!session?.user.id,
  });

  const categories = selectedType === "pengeluaran" ? pengeluaranList : pemasukanList;

  useEffect(() => {
    if (selectedType === "pengeluaran" && pengeluaranList) {
      setPengeluaranItems(pengeluaranList);
    } else if (selectedType === "pemasukan" && pemasukanList) {
      setPemasukanItems(pemasukanList);
    }
  }, [pengeluaranList, pemasukanList, selectedType]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories", "pengeluaran"] });
    queryClient.invalidateQueries({ queryKey: ["categories", "pemasukan"] });
  };

  const persistOrder = async (ordered: CategoryItem[], type: "pengeluaran" | "pemasukan") => {
    const baseTime = Date.now();
    for (let i = 0; i < ordered.length; i++) {
      const sortDate = new Date(baseTime - (ordered.length - i) * 1000).toISOString();
      await supabase.from("categories").update({ created_at: sortDate }).eq("id", ordered[i].id);
    }
    invalidate();
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      showToast("Kategori berhasil dihapus");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; name: string; icon: string; color: string; type: "pengeluaran" | "pemasukan" }) => {
      if (!session?.user.id) throw new Error("Not authenticated");
      if (data.id) {
        const { error } = await supabase.from("categories").update({ name: data.name, icon: data.icon, color: data.color }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert({
          user_id: session.user.id,
          name: data.name,
          icon: data.icon,
          color: data.color,
          type: data.type,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      showToast("Kategori berhasil disimpan");
    },
  });

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleEdit = (item: CategoryItem) => {
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleSave = async (data: { id?: string; name: string; icon: string; color: string; type: "pengeluaran" | "pemasukan" }) => {
    await saveMutation.mutateAsync(data);
    setModalVisible(false);
    setEditingItem(null);
  };

  const renderCategoryList = (items: CategoryItem[], type: "pengeluaran" | "pemasukan") => {
    return (
      <ScrollView style={{ flex: 1 }} scrollEnabled={draggedType === null}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="shape-outline" size={48} color={Colors.gray} />
            <ThemedText style={styles.emptyText}>Belum ada kategori {type}</ThemedText>
          </View>
        ) : (
          items.map((item, index) => {
            const isDragged = draggedType === type && draggedIndex === index;

            // Create interpolated shadow values
            const shadowOpacityInterp = dragShadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.4],
            });

            const elevationInterp = dragShadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 15],
            });

            return (
              <Animated.View
                key={item.id}
                onLayout={(e) => handleLayout(index, e.nativeEvent.layout.y)}
                style={
                  isDragged
                    ? {
                        transform: [{ translateY: dragOffset }, { scale: dragScaleAnim }],
                        zIndex: 10,
                        opacity: 0.95,
                        shadowColor: Colors.black,
                        shadowOpacity: shadowOpacityInterp,
                        shadowRadius: 12,
                        elevation: elevationInterp,
                      }
                    : {}
                }
              >
                <CategorySettingsItem item={item} onDelete={handleDelete} onEdit={handleEdit} isDragged={isDragged} onDragStart={(pageY) => handleDragStart(index, pageY, type)} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    );
  };

  const handleLayout = (index: number, y: number) => {
    itemLayouts.current[index] = y;
  };

  const handleDragStart = (index: number, pageY: number, type: "pengeluaran" | "pemasukan") => {
    startY.current = pageY;
    dragOffset.setValue(0);
    dragScaleAnim.setValue(1);
    dragShadowAnim.setValue(0);
    setDraggedIndex(index);
    setDraggedType(type);

    // Animate scale and shadow on start
    Animated.parallel([
      Animated.timing(dragScaleAnim, {
        toValue: 1.02,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(dragShadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDragMove = (pageY: number) => {
    const idx = draggedIndexRef.current;
    const type = draggedTypeRef.current;
    if (idx === null || type === null) return;

    const curItems = type === "pengeluaran" ? pengeluaranItemsRef.current : pemasukanItemsRef.current;
    const dy = pageY - startY.current;

    // Animate the drag offset smoothly with reduced drag distance (divide by 1.3)
    Animated.timing(dragOffset, {
      toValue: dy / 1.3,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const itemHeight = 56;
    const offset = Math.round(dy / 1.3 / itemHeight);
    let targetIndex = idx + offset;
    targetIndex = Math.max(0, Math.min(curItems.length - 1, targetIndex));

    if (targetIndex !== idx) {
      const reordered = [...curItems];
      const [moved] = reordered.splice(idx, 1);
      reordered.splice(targetIndex, 0, moved);

      if (type === "pengeluaran") {
        setPengeluaranItems(reordered);
      } else {
        setPemasukanItems(reordered);
      }

      setDraggedIndex(targetIndex);
      // Reset startY untuk recalculate gesture dari posisi baru
      startY.current = pageY;
    }
  };

  const handleDragEnd = () => {
    const idx = draggedIndexRef.current;
    const type = draggedTypeRef.current;
    if (idx === null || type === null) return;

    // Simpan items sebelum state reset
    const curItems = type === "pengeluaran" ? pengeluaranItemsRef.current : pemasukanItemsRef.current;

    Animated.parallel([
      Animated.spring(dragOffset, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(dragScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(dragShadowAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Setelah animasi selesai, baru reset state
      setDraggedIndex(null);
      setDraggedType(null);
      persistOrder(curItems, type);
    });
  };

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
              <ThemedText style={styles.headerTitle}>Atur Kategori</ThemedText>
            </View>
          ),
        }}
      />

      <View style={styles.toggleBar}>
        <View style={styles.toggleWrapper}>
          <View style={styles.toggleShadow} pointerEvents="none" />
          <View style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleChip, styles.toggleChipLeft, selectedType === "pengeluaran" && { backgroundColor: Colors.danger }]} onPress={() => setSelectedType("pengeluaran")} activeOpacity={0.8}>
              <ThemedText style={[styles.toggleText, selectedType === "pengeluaran" && styles.toggleTextActive]}>Pengeluaran</ThemedText>
            </TouchableOpacity>
            <View style={styles.toggleDivider} />
            <TouchableOpacity style={[styles.toggleChip, styles.toggleChipRight, selectedType === "pemasukan" && { backgroundColor: Colors.success }]} onPress={() => setSelectedType("pemasukan")} activeOpacity={0.8}>
              <ThemedText style={[styles.toggleText, selectedType === "pemasukan" && styles.toggleTextActive]}>Pemasukan</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.swipeArea} {...panResponder.panHandlers}>
        <Animated.View style={[styles.slideContainer, { width: screenWidth * 2, transform: [{ translateX: slideAnim }] }]}>
          {/* Pengeluaran Column */}
          <View style={{ width: screenWidth, flex: 1 }}>{renderCategoryList(pengeluaranItems, "pengeluaran")}</View>

          {/* Pemasukan Column */}
          <View style={{ width: screenWidth, flex: 1 }}>{renderCategoryList(pemasukanItems, "pemasukan")}</View>
        </Animated.View>
      </View>

      <View style={{ paddingHorizontal: Spacing.pageX, paddingTop: 0, paddingBottom: Spacing.twoHalf, backgroundColor: Colors.background }}>
        <View style={styles.addBtnOuter}>
          <View style={styles.addBtnShadow} pointerEvents="none" />
          <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]} onPress={handleAdd}>
            <MaterialCommunityIcons name="plus" size={22} color={Colors.black} />
            <ThemedText style={styles.addBtnText}>Tambah Kategori</ThemedText>
          </Pressable>
        </View>
      </View>

      <AddNewCategory
        visible={modalVisible}
        type={selectedType}
        editData={editingItem ? { id: editingItem.id, name: editingItem.name, icon: editingItem.icon, color: editingItem.color } : null}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />

      <ConfirmModal
        visible={deleteTargetId !== null}
        title="Hapus Kategori"
        message="Yakin mau hapus kategori ini?"
        confirmText="Ya, Hapus"
        cancelText="Gajadi"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </View>
  );
}

export default function CategorySettingsScreen() {
  return <CategorySettingsContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  toggleBar: {
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.twoHalf,
    marginBottom: 4,
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
  addBtnOuter: {
    position: "relative",
    paddingRight: 3,
    paddingBottom: 3,
  },
  addBtnShadow: {
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
  },
  addBtnPressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  addBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
