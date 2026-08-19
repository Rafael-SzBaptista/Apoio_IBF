import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BRL } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";

const valueChartConfig = {
  custo: { label: "Custo esperado", color: "var(--primary)" },
  lucro: { label: "Lucro esperado", color: "var(--chart-3)" },
  arrecadado: { label: "Arrecadado esperado", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function EventValueChart({
  people,
  chargedPerPerson,
  cost = 0,
  className,
  size = "md",
  ring = "var(--background)",
  metric = "valor",
}: {
  people: number;
  chargedPerPerson: number | null;
  cost?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  ring?: string;
  metric?: "valor" | "custo";
}) {
  const eventTotal = people > 0 && chargedPerPerson != null ? people * chargedPerPerson : 0;
  const eventCost = cost > 0 ? cost : 0;
  const eventProfit = eventTotal - eventCost;
  const profitSlice = Math.max(0, eventProfit);
  const showCost = metric === "custo";
  const centerValue = showCost ? eventCost : eventTotal;
  const slices = showCost
    ? eventCost > 0
      ? [{ key: "custo", name: "Custo esperado", value: eventCost, fill: "var(--primary)" }]
      : [{ key: "vazio", name: "—", value: 1, fill: "var(--muted)" }]
    : [
        { key: "custo", name: "Custo esperado", value: eventCost, fill: "var(--primary)" },
        { key: "arrecadado", name: "Arrecadado esperado", value: eventTotal, fill: "var(--chart-4)" },
        { key: "lucro", name: "Lucro esperado", value: profitSlice, fill: "var(--chart-3)" },
      ].filter((slice) => slice.value > 0);
  const pieData =
    slices.length > 0 ? slices : [{ key: "vazio", name: "—", value: 1, fill: "var(--muted)" }];
  const hasValues = pieData[0]?.key !== "vazio";

  const box = size === "lg" ? "size-52" : size === "sm" ? "size-40" : "size-48";
  const inner = size === "sm" ? 46 : 54;
  const outer = size === "sm" ? 70 : 82;
  const amountClass = size === "lg" ? "text-xl" : "text-lg";

  return (
    <div className={cn(className)}>
      {showCost && (
        <p className="text-sm text-muted-foreground">
          {people > 0
            ? "Soma dos itens da lista de compras"
            : "Depende das pessoas esperadas e da lista de compras."}
        </p>
      )}
      <div className={cn("relative mx-auto", showCost && "mt-3", box)}>
        <ChartContainer config={valueChartConfig} className={cn("aspect-square", box)}>
          <PieChart>
            {hasValues && (
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent hideLabel formatter={(value) => BRL.format(Number(value))} />
                }
              />
            )}
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={inner}
              outerRadius={outer}
              paddingAngle={hasValues && pieData.length > 1 ? 2 : 0}
              strokeWidth={2}
              stroke={ring}
            >
              {pieData.map((slice) => (
                <Cell key={slice.key} fill={slice.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="px-6 text-center">
            <p className={cn("font-display font-semibold leading-none", amountClass)}>
              {centerValue > 0 ? BRL.format(centerValue) : "—"}
            </p>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
              {showCost ? "Custo" : "Arrecadado"}
            </p>
          </div>
        </div>
      </div>
      {!showCost && (
        <div className="mt-1.5 grid gap-1 text-[11px] leading-tight">
          <LegendRow
            color="bg-primary"
            title="Custo esperado"
            how="soma da lista de compras"
            value={eventCost > 0 ? BRL.format(eventCost) : "—"}
          />
          <LegendRow
            color="bg-[var(--chart-4)]"
            title="Arrecadado esperado"
            how="pessoas × preço cobrado"
            value={eventTotal > 0 ? BRL.format(eventTotal) : "—"}
          />
          <LegendRow
            color="bg-[var(--chart-3)]"
            title="Lucro esperado"
            how="arrecadado − custo"
            value={eventTotal > 0 || eventCost > 0 ? BRL.format(eventProfit) : "—"}
          />
        </div>
      )}
    </div>
  );
}

function LegendRow({
  color,
  title,
  how,
  value,
}: {
  color: string;
  title: string;
  how: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 text-muted-foreground">
      <span className={cn("relative top-px size-2 shrink-0 rounded-full", color)} />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-medium text-foreground">{title}</span>
        {" — "}
        {how}
      </p>
      <span className="shrink-0 font-medium text-foreground">{value}</span>
    </div>
  );
}

export default EventValueChart;
