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
  action,
  onClick,
}: {
  topLeft: ReactNode;
  bottomLeft: ReactNode;
  topRight: ReactNode;
  bottomRight: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
}) {
  const className = cn(
    "flex w-full items-center rounded-xl border bg-card py-1.5 text-left",
    action ? "pl-4 pr-2" : "px-4",
    onClick && "transition-colors hover:bg-secondary/40",
  );

  const contentClassName = cn(
    "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5",
    onClick && "cursor-pointer",
  );

  const body = (
    <>
      <div className="min-w-0 truncate font-semibold leading-tight">{topLeft}</div>
      <div className="justify-self-end">{topRight}</div>
      <div className="min-w-0 truncate text-sm text-muted-foreground">{bottomLeft}</div>
      <div className="justify-self-end text-right text-sm text-muted-foreground">{bottomRight}</div>
    </>
  );

  return (
    <div className={className}>
      {onClick ? (
        <button type="button" className={contentClassName} onClick={onClick}>
          {body}
        </button>
      ) : (
        <div className={contentClassName}>{body}</div>
      )}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
