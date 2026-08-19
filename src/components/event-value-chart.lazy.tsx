import { lazy, Suspense, type ComponentProps } from "react";

const Chart = lazy(() => import("@/components/event-value-chart"));

export function EventValueChart(props: ComponentProps<typeof Chart>) {
  const size = props.size === "lg" ? "size-52" : props.size === "sm" ? "size-40" : "size-48";
  return (
    <Suspense fallback={<div className={`mx-auto ${size} animate-pulse rounded-full bg-muted/60`} />}>
      <Chart {...props} />
    </Suspense>
  );
}
