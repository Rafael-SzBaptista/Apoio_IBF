import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type MonthlyBalancePoint = {
  mes: string;
  gastos: number;
  receitas: number;
};

/** Alinha com o breakpoint `lg` do app (layout mobile). */
function useCompactChart() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  return compact;
}

export function FinanceMonthlyChart({ data }: { data: MonthlyBalancePoint[] }) {
  const compact = useCompactChart();

  return (
    <ChartContainer
      className="mt-3 aspect-auto h-64 w-full"
      config={{
        receitas: { label: "Receitas", color: "var(--color-success)" },
        gastos: { label: "Gastos", color: "var(--color-primary)" },
      }}
    >
      <BarChart
        data={data}
        barCategoryGap={compact ? "8%" : "18%"}
        barGap={compact ? 4 : 4}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value) =>
            Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="receitas"
          fill="var(--color-receitas)"
          radius={4}
          barSize={compact ? 18 : 28}
        />
        <Bar
          dataKey="gastos"
          fill="var(--color-gastos)"
          radius={4}
          barSize={compact ? 18 : 28}
        />
      </BarChart>
    </ChartContainer>
  );
}

export default FinanceMonthlyChart;
