import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Database, Search, Trash2, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { eventColor, isEventCompleted } from "@/lib/constants";
import { dbErrorMessage, formatDate, formatShortDate, isMissingRelation, weekday } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Field({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  label = "Buscar",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-60 shrink-0", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed bg-card/60 px-6 py-14 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function DbBanner({ error }: { error: unknown }) {
  if (!isMissingRelation(error)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erro ao carregar</AlertTitle>
        <AlertDescription>{dbErrorMessage(error)}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <Database className="size-4" />
      <AlertTitle>Banco ainda não configurado</AlertTitle>
      <AlertDescription>
        Abra o SQL Editor do Supabase e rode o arquivo{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          supabase/sql/rodar-no-editor.sql
        </code>
        . Depois recarregue esta página.
      </AlertDescription>
    </Alert>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const done = isEventCompleted(status);
  const tone = done
    ? "bg-success/15 text-success border-success/20"
    : "bg-primary/15 text-primary border-primary/20";
  return (
    <Badge variant="outline" className={cn("shrink-0", tone)}>
      {done ? "Concluída" : "Aberta"}
    </Badge>
  );
}

type EventLite = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  food_label: string | null;
  status: string;
  expected_people: number | null;
  event_assignments?: { area: string; members?: { full_name: string } | null }[] | null;
};

export function EventCard({ event }: { event: EventLite }) {
  const names = (event.event_assignments ?? [])
    .map((a) => a.members?.full_name)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Link to="/programacoes/$id" params={{ id: event.id }} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex gap-4 p-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-center">
            <span className="font-display text-lg font-bold leading-none">
              {formatShortDate(event.event_date).split("/")[0]}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {new Date(event.event_date + "T12:00:00").toLocaleDateString("pt-BR", {
                month: "short",
              })}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{event.title}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  eventColor(event.title),
                )}
              >
                {event.food_label ?? "sem cardápio"}
              </span>
            </div>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {weekday(event.event_date)} · {formatDate(event.event_date)}
              {event.event_time ? ` · ${event.event_time}` : ""}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {event.location ?? "Local a definir"}
              {event.expected_people ? ` · ${event.expected_people} pessoas` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              {names.length > 0 && (
                <span className="text-xs text-muted-foreground">{names.join(" · ")}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ListTable({ children }: { children: ReactNode }) {
  return <Table className="w-full">{children}</Table>;
}

function pagerPages(current: number, total: number, windowSize = 5) {
  if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function PagerButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
        active
          ? "border border-primary text-primary"
          : "text-foreground hover:bg-secondary",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function TablePager({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-3 flex justify-center" aria-label="Paginação">
      <div className="flex items-center gap-1">
        <PagerButton
          label="Primeira página"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="size-4" />
        </PagerButton>
        <PagerButton
          label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </PagerButton>
        {pagerPages(page, pageCount).map((number) => (
          <PagerButton
            key={number}
            label={`Página ${number}`}
            active={number === page}
            onClick={() => onPageChange(number)}
          >
            {number}
          </PagerButton>
        ))}
        <PagerButton
          label="Próxima página"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </PagerButton>
        <PagerButton
          label="Última página"
          disabled={page >= pageCount}
          onClick={() => onPageChange(pageCount)}
        >
          <ChevronsRight className="size-4" />
        </PagerButton>
      </div>
    </nav>
  );
}

export function ListTableHeaderRow({ children }: { children: ReactNode }) {
  return <TableRow className="border-y hover:bg-transparent">{children}</TableRow>;
}

export function ListTableHeadCell({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-10 whitespace-nowrap py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

export function listTableBodyRowClass(_index: number, extra?: string) {
  return cn("transition-colors hover:bg-secondary/50", extra);
}

export const listTableCellClass = "overflow-hidden py-2.5 pr-4 leading-6";
export const listTableMutedCellClass =
  "max-w-0 truncate py-2.5 pr-4 leading-6 text-muted-foreground";
export const listTableActionCellClass = "py-2.5 leading-6 text-right";

export function ListTableEmptyRow({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function TableDeleteButton({
  title,
  description,
  onConfirm,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SidePanel({
  open,
  onOpenChange,
  eyebrow,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b px-5 py-4 pr-12 text-left">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <SheetTitle className="font-display text-lg">{title}</SheetTitle>
        </SheetHeader>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 pointer-events-auto",
            "[&_.grid]:gap-3",
            "[&_.space-y-2]:space-y-1.5",
            "[&_input:not([type=file])]:h-8 [&_input:not([type=file])]:px-2.5 [&_input:not([type=file])]:text-sm",
            "[&_[data-slot=select-trigger]]:h-8 [&_[data-slot=select-trigger]]:px-2.5 [&_[data-slot=select-trigger]]:text-sm",
            "[&_[data-slot=picker-trigger]]:h-8 [&_[data-slot=picker-trigger]]:px-2.5 [&_[data-slot=picker-trigger]]:text-sm",
            "[&_textarea]:min-h-12 [&_textarea]:px-2.5 [&_textarea]:py-1.5 [&_textarea]:text-sm",
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t px-5 py-3">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export { TableBody, TableCell, TableHeader, TableRow };
