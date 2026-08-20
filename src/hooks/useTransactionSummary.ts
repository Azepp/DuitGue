import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { getCachedData } from "@/lib/offline";
import { localDb } from "@/lib/local-db";
import { parseLocalDate } from "@/lib/utils";
import type { CategorySummary, TransactionSummary, TransactionType, PeriodType } from "@/types/grafik";

type CachedTransaction = {
  id: string;
  amount: number;
  type: string;
  category_id: string;
  date: string;
  categories: { name: string; icon: string; color: string } | null;
};

type RawTransaction = {
  id: string;
  amount: number;
  type: string;
  date: string;
  category_id: string;
  categories?: { name: string; icon: string; color: string } | null;
};

function getDateRange(periodType: PeriodType, periodValue: string): { start: string; end: string } {
  if (periodType === "year") {
    return { start: `${periodValue}-01-01`, end: `${periodValue}-12-31` };
  }
  if (periodType === "month") {
    const [y, m] = periodValue.split("-");
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2, "0")}` };
  }
  const [y, m, w] = periodValue.split("-");
  const weekNum = Number(w.replace("W", ""));
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
  const startDay = (weekNum - 1) * 7 + 1;
  const endDay = Math.min(weekNum * 7, daysInMonth);
  return {
    start: `${y}-${m}-${String(startDay).padStart(2, "0")}`,
    end: `${y}-${m}-${String(endDay).padStart(2, "0")}`,
  };
}

function computeSummary(transactions: CachedTransaction[]): TransactionSummary {
  if (transactions.length === 0) return { total: 0, categories: [] };

  const map = new Map<string, { name: string; icon: string; color: string; amount: number }>();
  let total = 0;

  for (const tx of transactions) {
    const cat = tx.categories;
    if (!cat) continue;
    const existing = map.get(tx.category_id);
    if (existing) {
      existing.amount += tx.amount;
    } else {
      map.set(tx.category_id, { name: cat.name, icon: cat.icon, color: cat.color, amount: tx.amount });
    }
    total += tx.amount;
  }

  const categories: CategorySummary[] = Array.from(map.entries())
    .map(([id, cat]) => ({
      id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      amount: cat.amount,
      percentage: total > 0 ? Math.round((cat.amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { total, categories };
}

export function useTransactionSummary(
  type: TransactionType,
  periodType: PeriodType,
  periodValue: string,
) {
  const session = useAuthStore((s) => s.session);

  return useQuery<TransactionSummary>({
    queryKey: ["transactionSummary", type, periodType, periodValue, session?.user.id],
    enabled: !!session?.user.id && !!periodValue,
    queryFn: async () => {
      if (!session?.user.id) return { total: 0, categories: [] };

      const dbType = type === "expense" ? "pengeluaran" : "pemasukan";
      const { start, end } = getDateRange(periodType, periodValue);

      const { data: transactions } = await supabase
        .from("transactions")
        .select("id, amount, category_id, type, date, categories!inner(name, icon, color)")
        .eq("user_id", session.user.id)
        .eq("type", dbType)
        .gte("date", start)
        .lte("date", end);

      if (!transactions || transactions.length === 0) {
        localDb.clearTable("transactions_summary");
        return { total: 0, categories: [] };
      }

      const result = transactions as unknown as { id: string; amount: number; category_id: string; type: string; date: string; categories: { name: string; icon: string; color: string } }[];

      const toCache: CachedTransaction[] = result.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        type: dbType,
        category_id: tx.category_id,
        date: tx.date,
        categories: tx.categories,
      }));
      if (toCache.length > 0) localDb.setAll("transactions_summary", toCache);

      const summary = computeSummary(toCache);
      return summary;
    },
    placeholderData: () => {
      try {
        const { start, end } = getDateRange(periodType, periodValue);
        const dbType = type === "expense" ? "pengeluaran" : "pemasukan";

        const cached = getCachedData<CachedTransaction>("transactions_summary");
        if (cached.length > 0) {
          const filtered = cached.filter(
            (tx) => tx.date >= start && tx.date <= end && tx.type === dbType,
          );
          if (filtered.length > 0) return computeSummary(filtered);
        }

        const rawCached = getCachedData<RawTransaction>("transactions");
        if (rawCached.length > 0) {
          const filtered = rawCached
            .filter(
              (tx) =>
                tx.date >= start &&
                tx.date <= end &&
                tx.type === dbType &&
                tx.category_id &&
                tx.categories,
            )
            .map((tx) => ({
              id: `${tx.category_id}_${tx.date}`,
              amount: tx.amount,
              type: dbType,
              category_id: tx.category_id,
              date: tx.date,
              categories: tx.categories ?? null,
            }));
          if (filtered.length > 0) return computeSummary(filtered);
        }

        return undefined;
      } catch {
        return undefined;
      }
    },
  });
}

export function usePeriodOptions(periodType: PeriodType) {
  const session = useAuthStore((s) => s.session);

  const currentYear = new Date().getFullYear();

  return useQuery<string[]>({
    queryKey: ["periodOptions", periodType, session?.user.id],
    enabled: !!session?.user.id,
    queryFn: async () => {
      if (!session?.user.id) return [];

      const { data } = await supabase
        .from("transactions")
        .select("date")
        .eq("user_id", session.user.id)
        .order("date", { ascending: true })
        .limit(1);

      let firstYear = currentYear;

      if (data && data.length > 0 && data[0].date) {
        firstYear = parseLocalDate(data[0].date).getFullYear();
      }

      const years: string[] = [];
      for (let y = currentYear; y >= firstYear; y--) {
        years.push(String(y));
      }

      let result: string[];
      if (periodType === "year") result = years;
      else if (periodType === "month") result = generateMonths();
      else result = generateWeeks();

      localDb.setAll("period_options", result.map((v, i) => ({ id: `${periodType}_${i}`, value: v })));
      return result;
    },
    placeholderData: () => {
      const cached = getCachedData<{ id: string; value: string }>("period_options");
      if (cached.length > 0) {
        const values = cached
          .filter((c) => c.id.startsWith(periodType))
          .map((c) => c.value);
        if (values.length > 0) return values;
      }
      if (periodType === "year") return [String(currentYear)];
      if (periodType === "month") return generateMonths();
      return generateWeeks();
    },
  });
}

function generateMonths(): string[] {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const currentYear = new Date().getFullYear();
  return months.map((m, i) => `${currentYear}-${String(i + 1).padStart(2, "0")}-${m}`);
}

function generateWeeks(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: string[] = [];
  let weekNum = 1;
  for (let d = 1; d <= daysInMonth; d += 7) {
    weeks.push(`${year}-${String(month).padStart(2, "0")}-W${weekNum}`);
    weekNum++;
  }
  return weeks;
}
