import { lazy, Suspense } from "react";

type MonthlyBalancePoint = {
  mes: string;
  gastos: number;
  receitas: number;
};

const Chart = lazy(() => import("@/components/finance-monthly-chart"));

export function FinanceMonthlyChart({ data }: { data: MonthlyBalancePoint[] }) {
  return (
    <Suspense fallback={<div className="mt-3 h-64 animate-pulse rounded-md bg-muted/60" />}>
      <Chart data={data} />
    </Suspense>
  );
}
