import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuthStore } from "@/stores/auth-store";
import { cacheQueryData, getCachedData, offlineDelete } from "@/lib/offline";
import { getQueueLength } from "@/lib/sync-queue";
import { useNetwork } from "@/lib/network";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type TransactionWithCategory = {
  id: string;
  amount: number;
  type: "pengeluaran" | "pemasukan";
  note: string | null;
  date: string;
  categories: { name: string; icon: string; color: string } | null;
};

type DailyGroup = {
  date: string;
  dayName: string;
  transactions: TransactionWithCategory[];
  totalPengeluaran: number;
  totalPemasukan: number;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function HomeScreen() {
  const session = useAuthStore((s) => s.session);
  const { isOnline } = useNetwork();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    setPendingCount(getQueueLength());
    const interval = setInterval(() => {
      setPendingCount(getQueueLength());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteTx = useCallback(
    async (tx: TransactionWithCategory) => {
      if (!session?.user.id) return;
      await offlineDelete("transactions", tx.id, session.user.id, ["transactions"]);
      showToast("Catatan berhasil dihapus!");
    },
    [session?.user.id, selectedYear, selectedMonth, showToast],
  );

  const handleEditTx = useCallback((tx: TransactionWithCategory) => {
    router.push({ pathname: "/(app)/add-transaction", params: { edit: tx.id } as Record<string, string> });
  }, []);

  const selectedMonthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const startOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const lastDay = getDaysInMonth(selectedYear, selectedMonth);
  const endOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const userId = session?.user.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
      const profileData = data as { id: string; display_name: string } | null;
      if (profileData) cacheQueryData("profiles", [{ ...profileData, id: userId }]);
      return profileData as { display_name: string } | null;
    },
    enabled: !!userId,
    placeholderData: () => {
      const cached = getCachedData<{ id: string; display_name: string }>("profiles");
      const match = cached.find((p) => p.id === userId);
      return match || null;
    },
  });

  const displayName = profile?.display_name || session?.user?.user_metadata?.display_name || "UserDuit";

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    if (profile && !profile.display_name) {
      setNameInput(session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "");
      setShowNameModal(true);
    }
  }, [profile]);

  const nameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("profiles").upsert({ id: userId, display_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setShowNameModal(false);
      showToast("Nama berhasil disimpan!");
    },
  });

  const { data: allTransactions } = useQuery({
    queryKey: ["transactions", "all", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", userId);
      const result = (data ?? []) as { amount: number; type: "pengeluaran" | "pemasukan" }[];
      return result;
    },
    enabled: !!userId,
    placeholderData: () => {
      const cached = getCachedData<{ id: string; amount: number; type: "pengeluaran" | "pemasukan" }>("transactions");
      return cached.length > 0 ? cached : undefined;
    },
  });

  const balance = useMemo(() => {
    if (!allTransactions) return 0;
    return allTransactions.reduce((acc, t) => {
      return t.type === "pemasukan" ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [allTransactions]);

  const { data: monthlyTransactions } = useQuery({
    queryKey: ["transactions", "monthly", selectedYear, selectedMonth, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*, categories(name, icon, color)")
        .eq("user_id", userId)
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      const result = (data ?? []) as TransactionWithCategory[];
      cacheQueryData("transactions", result);
      return result;
    },
    enabled: !!userId,
    placeholderData: () => {
      const cached = getCachedData<TransactionWithCategory>("transactions");
      if (cached.length === 0) return undefined;
      const matching = cached.filter((tx) => tx.date >= startOfMonth && tx.date <= endOfMonth);
      return matching.length > 0 ? matching : undefined;
    },
  });

  const monthlyTotals = useMemo(() => {
    if (!monthlyTransactions) return { pengeluaran: 0, pemasukan: 0 };
    return monthlyTransactions.reduce(
      (acc, t) => {
        if (t.type === "pengeluaran") acc.pengeluaran += t.amount;
        else acc.pemasukan += t.amount;
        return acc;
      },
      { pengeluaran: 0, pemasukan: 0 },
    );
  }, [monthlyTransactions]);

  const dailyGroups = useMemo(() => {
    if (!monthlyTransactions) return [];

    const groups: Record<string, TransactionWithCategory[]> = {};
    for (const t of monthlyTransactions) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, transactions]) => {
        const d = new Date(date + "T00:00:00");
        const day = d.getDate();
        const monthName = MONTHS[d.getMonth()];
        const dayName = d.toLocaleDateString("id-ID", { weekday: "long" });
        const label = `${day} ${monthName} - ${dayName}`;
        const totalPengeluaran = transactions
          .filter((t) => t.type === "pengeluaran")
          .reduce((s, t) => s + t.amount, 0);
        const totalPemasukan = transactions
          .filter((t) => t.type === "pemasukan")
          .reduce((s, t) => s + t.amount, 0);
        return { date, dayName: label, transactions, totalPengeluaran, totalPemasukan };
      });
  }, [monthlyTransactions]);

  const monthPickerItems = useMemo(() => {
    const items: { month: number; year: number; label: string }[] = [];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let i = 0; i < 12; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      if (m < 0) {
        m += 12;
        y -= 1;
      }
      items.push({ month: m, year: y, label: `${MONTHS[m]} ${y}` });
    }
    return items;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.greeting}>Haihai, {displayName}</ThemedText>
        <View style={styles.headerRight}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <MaterialCommunityIcons name="wifi-off" size={14} color={Colors.white} />
              <ThemedText style={styles.offlineBadgeText}>Offline</ThemedText>
            </View>
          )}
          {pendingCount > 0 && (
            <View style={styles.syncBadge}>
              <ThemedText style={styles.syncBadgeText}>{pendingCount}</ThemedText>
            </View>
          )}
          <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/search')}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardShadow}>
          <View style={styles.cardShadowFill} pointerEvents="none" />
          <View style={styles.dashboardCard}>
            <View style={styles.dashboardHeader}>
              <View>
                <ThemedText style={styles.dashboardLabel}>Duit lu sekarang</ThemedText>
                <ThemedText style={styles.balanceAmount}>{formatRupiah(balance)}</ThemedText>
              </View>

              <TouchableOpacity style={styles.plusBtn} onPress={() => router.push({ pathname: "/(app)/add-transaction", params: { type: "pemasukan" } })}>
                <MaterialCommunityIcons name="plus" size={20} color={Colors.black} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.monthFilter} onPress={() => setShowMonthPicker(true)}>
          <ThemedText style={styles.monthFilterText}>{selectedMonthLabel}</ThemedText>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.black} />
        </TouchableOpacity>

        <View style={styles.summaryRow}>
          <View style={styles.summaryShadow}>
            <View style={styles.summaryShadowFill} pointerEvents="none" />
            <View style={[styles.summaryCard, { backgroundColor: Colors.danger }]}>
              <ThemedText style={styles.summaryLabel}>Pengeluaran</ThemedText>
              <ThemedText style={styles.summaryAmount}>{formatRupiah(monthlyTotals.pengeluaran)}</ThemedText>
            </View>
          </View>
          <View style={styles.summaryShadow}>
            <View style={styles.summaryShadowFill} pointerEvents="none" />
            <View style={[styles.summaryCard, { backgroundColor: Colors.success }]}>
              <ThemedText style={styles.summaryLabel}>Pemasukan</ThemedText>
              <ThemedText style={styles.summaryAmount}>{formatRupiah(monthlyTotals.pemasukan)}</ThemedText>
            </View>
          </View>
        </View>

        {dailyGroups.map((group) => (
          <View key={group.date}>
            <View style={styles.dateHeader}>
              <ThemedText style={styles.dateLabel}>{group.dayName}</ThemedText>
              <View style={styles.dateTotals}>
                <ThemedText style={styles.datePengeluaran}>Pengeluaran {formatRupiah(group.totalPengeluaran)}</ThemedText>
                <ThemedText style={styles.datePemasukan}>Pemasukan {formatRupiah(group.totalPemasukan)}</ThemedText>
              </View>
            </View>

            {group.transactions.map((tx) => {
              const cat = tx.categories;
              const color = cat?.color || Colors.gray;
              const isPengeluaran = tx.type === "pengeluaran";
              const isExpanded = expandedTxId === tx.id;
              return (
                <View key={tx.id} style={styles.txShadow}>
                  <View style={styles.txShadowFill} pointerEvents="none" />
                  <View style={styles.txCard}>
                    <TouchableOpacity style={styles.txMainRow} onPress={() => setExpandedTxId(isExpanded ? null : tx.id)} activeOpacity={0.8}>
                      <View style={[styles.txIcon, { backgroundColor: color }]}>
                        <MaterialCommunityIcons name={(cat?.icon || "help-circle-outline") as any} size={20} color={Colors.white} />
                      </View>
                      <View style={styles.txInfo}>
                        <ThemedText style={styles.txName}>{cat?.name || "Kategori"}</ThemedText>
                        {tx.note ? <ThemedText style={styles.txNote}>{tx.note}</ThemedText> : null}
                      </View>
                      <ThemedText style={[styles.txAmount, { color: isPengeluaran ? Colors.danger : Colors.success }]}>
                        {isPengeluaran ? "-" : "+"}
                        {formatRupiah(tx.amount)}
                      </ThemedText>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.accordionRow}>
                        <TouchableOpacity style={[styles.accordionBtn, { backgroundColor: Colors.blue }]} onPress={() => handleEditTx(tx)} activeOpacity={0.8}>
                          <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.white} />
                          <ThemedText style={styles.accordionBtnText}>Edit</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.accordionBtn, { backgroundColor: Colors.danger }]} onPress={() => handleDeleteTx(tx)} activeOpacity={0.8}>
                          <MaterialCommunityIcons name="delete-outline" size={18} color={Colors.white} />
                          <ThemedText style={styles.accordionBtnText}>Hapus</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {monthlyTransactions && monthlyTransactions.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="receipt-outline" size={48} color={Colors.gray} />
            <ThemedText style={styles.emptyText}>Belum ada transaksi bulan ini</ThemedText>
          </View>
        )}
      </ScrollView>

      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthPicker(false)}>
          <Pressable style={styles.monthPicker} onPress={() => {}}>
            <ThemedText style={styles.monthPickerTitle}>Pilih Bulan</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false}>
            {monthPickerItems.map((item) => {
              const isSelected = item.month === selectedMonth && item.year === selectedYear;
              return (
                <TouchableOpacity
                  key={`${item.year}-${item.month}`}
                  style={[styles.monthItem, isSelected && styles.monthItemSelected]}
                  onPress={() => {
                    setSelectedMonth(item.month);
                    setSelectedYear(item.year);
                    setShowMonthPicker(false);
                  }}
                >
                  <ThemedText style={[styles.monthItemText, isSelected && styles.monthItemTextSelected]}>{item.label}</ThemedText>
                  {isSelected && <MaterialCommunityIcons name="check" size={18} color={Colors.white} />}
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => {}}>
        <Pressable style={styles.modalOverlay}>
          <Pressable style={styles.nameModal} onPress={() => {}}>
            <ThemedText style={styles.nameModalTitle}>Kasih nama panggilan lu</ThemedText>
            <TextInput
              style={styles.nameInput}
              placeholder="nama panggilan..."
              placeholderTextColor={Colors.gray}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.nameSubmitBtn, !nameInput.trim() && { opacity: 0.5 }]}
              disabled={!nameInput.trim() || nameMutation.isPending}
              onPress={() => nameMutation.mutate(nameInput.trim())}
            >
              <ThemedText style={styles.nameSubmitText}>{nameMutation.isPending ? "Menyimpan..." : "Gaskeun"}</ThemedText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.pageY,
    paddingBottom: Spacing.two,
  },
  greeting: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.textSecondary,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  syncBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
  },
  syncBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.pageX,
    paddingBottom: Spacing.six,
  },
  cardShadow: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    paddingRight: 4,
    paddingBottom: 4,
  },
  cardShadowFill: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: Colors.black,
  },
  dashboardCard: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dashboardLabel: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  monthFilter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginBottom: Spacing.twoHalf,
  },
  monthFilterText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  summaryShadow: {
    flex: 1,
    paddingRight: 3,
    paddingBottom: 3,
  },
  summaryShadowFill: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
  },
  summaryCard: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    padding: Spacing.twoHalf,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  dateHeader: {
    marginBottom: Spacing.one,
    marginTop: Spacing.two,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  dateTotals: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  datePengeluaran: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  datePemasukan: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  txShadow: {
    marginBottom: Spacing.two,
    paddingRight: 3,
    paddingBottom: 3,
  },
  txShadowFill: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
  },
  txCard: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  txMainRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.twoHalf,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.twoHalf,
  },
  txInfo: {
    flex: 1,
  },
  txName: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  txNote: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.six,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.gray,
    marginTop: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  monthPicker: {
    width: "80%",
    maxHeight: "70%",
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: Spacing.four,
  },
  monthPickerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.three,
    textAlign: "center",
  },
  monthItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.one,
  },
  monthItemSelected: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  monthItemText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  monthItemTextSelected: {
    fontFamily: Fonts.bold,
  },
  accordionRow: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    paddingBottom: Spacing.twoHalf,
  },
  accordionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 8,
    paddingVertical: Spacing.two,
  },
  accordionBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  nameModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: Colors.black,
    padding: Spacing.five,
    width: "85%",
    maxWidth: 360,
    alignItems: "center",
  },
  nameModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.three,
    textAlign: "center",
  },
  nameInput: {
    width: "100%",
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    marginBottom: Spacing.four,
  },
  nameSubmitBtn: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    width: "100%",
    alignItems: "center",
  },
  nameSubmitText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
