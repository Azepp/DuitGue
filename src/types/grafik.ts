export type TransactionType = "expense" | "income";

export type PeriodType = "week" | "month" | "year";

export type CategorySummary = {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
};

export type TransactionSummary = {
  total: number;
  categories: CategorySummary[];
};
