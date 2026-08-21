import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SummaryDonut({
  label,
  display,
  fill,
  caption,
  captionClassName,
  size = "md",
  delayMs = 0,
  hideLabel = false,
}: {
  label: string;
  display: ReactNode;
  fill: string;
  caption: string;
  captionClassName?: string;
  size?: "sm" | "md";
  delayMs?: number;
  hideLabel?: boolean;
}) {
  const compact = size === "sm";

  return (
    <div className="flex flex-col items-center gap-2 py-1">
      {hideLabel ? <span className="sr-only">{label}</span> : (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
      <div className={cn("relative", compact ? "size-36 lg:size-44" : "size-40")}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="12"
            opacity="0.5"
          />
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke={fill}
            strokeWidth="12"
            pathLength={100}
            strokeDasharray={100}
            className="[stroke-dashoffset:0] motion-safe:animate-donut-fill"
            style={{ animationDelay: `${delayMs}ms` }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p
            className={
              compact
                ? "font-display text-xl font-semibold lg:text-2xl"
                : "max-w-[4.75rem] text-center font-display text-sm font-semibold leading-tight"
            }
          >
            {display}
          </p>
        </div>
      </div>
      <p className={cn("text-center text-xs", captionClassName ?? "text-muted-foreground")}>{caption}</p>
    </div>
  );
}
