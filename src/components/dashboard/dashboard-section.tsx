import type { ReactNode } from "react";

const sectionTone = {
  blue: "bg-chart-1",
  magenta: "bg-chart-2",
  orange: "bg-chart-3",
  ink: "bg-foreground",
} as const;

export function DashboardSection({
  title,
  tone = "blue",
  children,
  action,
}: {
  title: string;
  tone?: keyof typeof sectionTone;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-border/70 bg-card px-4 py-4 sm:px-5">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
        <span className={`size-2 shrink-0 rounded-full ${sectionTone[tone]}`} aria-hidden />
        {title}
      </h2>
      <div className="mt-3 flex-1">{children}</div>
      {action ? <div className="mt-3 border-t border-border/70 pt-3">{action}</div> : null}
    </section>
  );
}

export function dashboardLinkClass() {
  return "inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/75";
}
