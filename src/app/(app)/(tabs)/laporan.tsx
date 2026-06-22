import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { Colors, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { YearFilterDropdown } from "@/components/laporan/year-filter-dropdown";

const formatNumber = (n: number) => n.toLocaleString("id-ID");

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type MonthSummary = {
  month: number;
  monthLabel: string;
  pengeluaran: number;
  pemasukan: number;
  saldo: number;
};

type YearSummary = {
  year: number;
  months: MonthSummary[];
  totalPengeluaran: number;
  totalPemasukan: number;
  totalSaldo: number;
};

type LaporanData = {
  yearlySummaries: YearSummary[];
  grandTotal: { pengeluaran: number; pemasukan: number; saldo: number };
};

export default function LaporanScreen() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const [selectedYear, setSelectedYear] = useState<string | "all">("all");

  const { data: years = [] } = useQuery<string[]>({
    queryKey: ["laporanYears", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("date")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .limit(1);

      const currentYear = new Date().getFullYear();
      let firstYear = currentYear;
      if (data && data.length > 0 && data[0].date) {
        firstYear = new Date(data[0].date).getFullYear();
      }

      const yearsList: string[] = [];
      for (let y = currentYear; y >= firstYear; y--) {
        yearsList.push(String(y));
      }
      return yearsList;
    },
    enabled: !!userId,
  });

  const { data: summary, isLoading } = useQuery<LaporanData>({
    queryKey: ["laporanSummary", selectedYear, userId],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("amount, type, date")
        .eq("user_id", userId);

      if (selectedYear !== "all") {
        query = query
          .gte("date", `${selectedYear}-01-01`)
          .lte("date", `${selectedYear}-12-31`);
      }

      const { data } = await query.order("date", { ascending: false });
      if (!data) {
        return { yearlySummaries: [], grandTotal: { pengeluaran: 0, pemasukan: 0, saldo: 0 } };
      }

      const byYear: Record<number, Record<number, MonthSummary>> = {};

      for (const tx of data) {
        const d = new Date(tx.date + "T00:00:00");
        const year = d.getFullYear();
        const month = d.getMonth();

        if (!byYear[year]) byYear[year] = {};
        if (!byYear[year][month]) {
          byYear[year][month] = { month, monthLabel: MONTHS[month], pengeluaran: 0, pemasukan: 0, saldo: 0 };
        }

        if (tx.type === "pengeluaran") {
          byYear[year][month].pengeluaran += tx.amount;
        } else {
          byYear[year][month].pemasukan += tx.amount;
        }
      }

      const yearlySummaries: YearSummary[] = Object.entries(byYear)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([yearStr, monthsMap]) => {
          const months = Object.values(monthsMap)
            .map((m) => ({ ...m, saldo: m.pemasukan - m.pengeluaran }))
            .sort((a, b) => b.month - a.month);

          const totalPengeluaran = months.reduce((s, m) => s + m.pengeluaran, 0);
          const totalPemasukan = months.reduce((s, m) => s + m.pemasukan, 0);
          return {
            year: Number(yearStr),
            months,
            totalPengeluaran,
            totalPemasukan,
            totalSaldo: totalPemasukan - totalPengeluaran,
          };
        });

      const grandTotal = yearlySummaries.reduce(
        (acc, y) => ({
          pengeluaran: acc.pengeluaran + y.totalPengeluaran,
          pemasukan: acc.pemasukan + y.totalPemasukan,
          saldo: acc.saldo + y.totalSaldo,
        }),
        { pengeluaran: 0, pemasukan: 0, saldo: 0 },
      );

      return { yearlySummaries, grandTotal };
    },
    enabled: !!userId,
  });

  const safeSummary = summary ?? { yearlySummaries: [] as YearSummary[], grandTotal: { pengeluaran: 0, pemasukan: 0, saldo: 0 } };
  const isEmpty = !isLoading && safeSummary.yearlySummaries.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Laporan</Text>
        <YearFilterDropdown
          years={years}
          selectedYear={selectedYear}
          onSelect={setSelectedYear}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={Colors.black} />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
          </View>
        ) : (
          <>
            <View style={styles.cardShadow}>
              <View style={styles.cardShadowFill} pointerEvents="none" />
              <View style={styles.dashboardCard}>
                <Text style={styles.dashboardLabel}>Saldo Total</Text>
                <Text style={styles.balanceAmount}>{formatRupiah(safeSummary.grandTotal.saldo)}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryShadow}>
                <View style={styles.summaryShadowFill} pointerEvents="none" />
                <View style={[styles.summaryCard, { backgroundColor: Colors.danger }]}>
                  <Text style={styles.summaryLabel}>Pengeluaran</Text>
                  <Text style={styles.summaryAmount}>{formatRupiah(safeSummary.grandTotal.pengeluaran)}</Text>
                </View>
              </View>
              <View style={styles.summaryShadow}>
                <View style={styles.summaryShadowFill} pointerEvents="none" />
                <View style={[styles.summaryCard, { backgroundColor: Colors.success }]}>
                  <Text style={styles.summaryLabel}>Pemasukan</Text>
                  <Text style={styles.summaryAmount}>{formatRupiah(safeSummary.grandTotal.pemasukan)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.headerMonth]}>Bulan</Text>
              <Text style={[styles.tableHeaderCell, styles.headerAmount]}>Pengeluaran</Text>
              <Text style={[styles.tableHeaderCell, styles.headerAmount]}>Pemasukan</Text>
              <Text style={[styles.tableHeaderCell, styles.headerAmount]}>Saldo</Text>
            </View>

            {safeSummary.yearlySummaries.map((yearSummary) => (
              <View key={yearSummary.year} style={styles.tableSection}>
                <Text style={styles.yearLabel}>{yearSummary.year}</Text>

                {yearSummary.months.map((month) => (
                  <View key={`${yearSummary.year}-${month.month}`} style={styles.tableRow}>
                    <Text style={styles.monthName}>{month.monthLabel}</Text>
                    <Text style={styles.amount}>{formatNumber(month.pengeluaran)}</Text>
                    <Text style={styles.amount}>{formatNumber(month.pemasukan)}</Text>
                    <Text style={styles.amount}>{formatNumber(month.saldo)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
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
    fontWeight: "700",
    color: Colors.black,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.pageX,
    paddingBottom: Spacing.six,
  },
  loadingState: {
    paddingVertical: 100,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.six,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray,
    marginTop: Spacing.two,
  },

  // -- Dashboard card (Saldo Total) like home page --
  cardShadow: {
    marginTop: 8,
    marginBottom: 12,
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
    padding: Spacing.three,
  },
  dashboardLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.black,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.black,
  },

  // -- Summary cards (Pengeluaran / Pemasukan) like home page --
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginBottom: 12,
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
    fontWeight: "600",
    color: Colors.white,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },

  // -- Table header --
  tableHeader: {
    flexDirection: "row",
    marginTop: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.black,
    marginBottom: 6,
    gap: 14,
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
  },
  headerMonth: {
    flex: 0.6,
  },
  headerAmount: {
    flex: 1,
    textAlign: "left",
  },

  // -- Table body --
  tableSection: {
    marginBottom: 8,
  },
  yearLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.danger,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2,
    gap: 14,
  },
  monthName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
    flex: 0.6,
  },
  amount: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
    flex: 1,
    textAlign: "left",
  },
});
