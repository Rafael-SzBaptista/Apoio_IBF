import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MobileRecordList({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 lg:hidden">{children}</div>;
}

export function MobileRecordCard({
  topLeft,
  bottomLeft,
  topRight,
  bottomRight,
  onClick,
}: {
  topLeft: ReactNode;
  bottomLeft: ReactNode;
  topRight: ReactNode;
  bottomRight: ReactNode;
  onClick?: () => void;
}) {
  const className = cn(
    "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-xl border bg-card px-4 py-1.5 text-left",
    onClick && "cursor-pointer transition-colors hover:bg-secondary/40",
  );

  const body = (
    <>
      <div className="min-w-0 truncate font-semibold leading-tight">{topLeft}</div>
      <div className="justify-self-end">{topRight}</div>
      <div className="min-w-0 truncate text-sm text-muted-foreground">{bottomLeft}</div>
      <div className="justify-self-end text-right text-sm text-muted-foreground">{bottomRight}</div>
    </>
  );

  if (!onClick) return <div className={className}>{body}</div>;

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  );
}
