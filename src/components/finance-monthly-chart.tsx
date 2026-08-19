import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type MonthlyBalancePoint = {
  mes: string;
  gastos: number;
  receitas: number;
};

export function FinanceMonthlyChart({ data }: { data: MonthlyBalancePoint[] }) {
  return (
    <ChartContainer
      className="mt-3 aspect-auto h-64 w-full"
      config={{
        receitas: { label: "Receitas", color: "var(--color-success)" },
        gastos: { label: "Gastos", color: "var(--color-primary)" },
      }}
    >
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="mes" tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={(value) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="receitas" fill="var(--color-receitas)" radius={4} />
        <Bar dataKey="gastos" fill="var(--color-gastos)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export default FinanceMonthlyChart;
