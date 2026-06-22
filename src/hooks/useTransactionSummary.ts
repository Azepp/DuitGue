import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import type { CategorySummary, TransactionSummary, TransactionType, PeriodType } from "@/types/grafik";

function getDateRange(periodType: PeriodType, periodValue: string): { start: string; end: string } {
  if (periodType === "year") {
    return { start: `${periodValue}-01-01`, end: `${periodValue}-12-31` };
  }
  if (periodType === "month") {
    const [y, m] = periodValue.split("-");
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(lastDay).padStart(2, "0")}` };
  }
  // week: "2026-03-W1"
  const [y, m, w] = periodValue.split("-");
  const weekNum = Number(w.replace("W", ""));
  const firstOfMonth = new Date(Number(y), Number(m) - 1, 1);
  const firstDay = firstOfMonth.getDay();
  const startDay = 1 + (weekNum - 1) * 7 - firstDay + 1;
  const endDay = startDay + 6;
  return {
    start: `${y}-${m}-${String(Math.max(1, startDay)).padStart(2, "0")}`,
    end: `${y}-${m}-${String(Math.min(endDay, new Date(Number(y), Number(m), 0).getDate())).padStart(2, "0")}`,
  };
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
        .select("amount, category_id, categories!inner(name, icon, color)")
        .eq("user_id", session.user.id)
        .eq("type", dbType)
        .gte("date", start)
        .lte("date", end);

      if (!transactions || transactions.length === 0) {
        return { total: 0, categories: [] };
      }

      const map = new Map<string, { name: string; icon: string; color: string; amount: number }>();
      let total = 0;

      for (const tx of transactions) {
        const cat = tx.categories as unknown as { name: string; icon: string; color: string };
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
    },
  });
}

export function usePeriodOptions(periodType: PeriodType) {
  const session = useAuthStore((s) => s.session);

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

      const currentYear = new Date().getFullYear();
      let firstYear = currentYear;

      if (data && data.length > 0 && data[0].date) {
        firstYear = new Date(data[0].date).getFullYear();
      }

      const years: string[] = [];
      for (let y = currentYear; y >= firstYear; y--) {
        years.push(String(y));
      }

      if (periodType === "year") return years;
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
