import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BRL } from "@/lib/apoio-utils";
import { dashboardLinkClass } from "@/components/dashboard/dashboard-section";

const cardTone = {
  blue: "border-t-chart-1",
  magenta: "border-t-chart-2",
  orange: "border-t-chart-3",
  ink: "border-t-foreground",
} as const;

function SummaryCard({
  label,
  tone,
  children,
}: {
  label: string;
  tone: keyof typeof cardTone;
  children: ReactNode;
}) {
  return (
    <article
      className={`min-w-0 rounded-2xl border border-border/70 border-t-[3px] bg-card px-4 py-3.5 ${cardTone[tone]}`}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </article>
  );
}

export function NextProgramCard({
  day,
  month,
  title,
  time,
  eventId,
  unavailable,
}: {
  day?: string | undefined;
  month?: string | undefined;
  title?: string | undefined;
  time?: string | null | undefined;
  eventId?: string | undefined;
  unavailable?: boolean | undefined;
}) {
  return (
    <SummaryCard label="Próxima programação" tone="blue">
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
      ) : eventId && day && month && title ? (
        <>
          <p className="font-display text-2xl font-semibold leading-none tracking-tight">
            {day} {month}
          </p>
          <p className="mt-2 truncate font-medium">{title}</p>
          {time ? <p className="text-sm text-muted-foreground">{time}</p> : null}
          <Link
            to="/programacoes/$id"
            params={{ id: eventId }}
            className={`${dashboardLinkClass()} mt-3`}
          >
            Ver detalhes →
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm leading-snug text-muted-foreground">Nenhuma programação futura.</p>
          <Link to="/programacoes" className={`${dashboardLinkClass()} mt-3`}>
            Ver programações →
          </Link>
        </>
      )}
    </SummaryCard>
  );
}

export function PendingCard({ count, incomplete }: { count: number; incomplete?: boolean }) {
  const hint =
    count === 0
      ? incomplete
        ? "Não foi possível verificar tudo"
        : "Tudo em dia"
      : count === 1
        ? "item precisa de atenção"
        : "itens precisam de atenção";

  return (
    <SummaryCard label="Pendências" tone="magenta">
      <p className="font-display text-3xl font-semibold leading-none tabular-nums">{count}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </SummaryCard>
  );
}

export function MonthBalanceCard({
  saldo,
  receitas,
  gastos,
  unavailable,
}: {
  saldo: number;
  receitas: number;
  gastos: number;
  unavailable?: boolean;
}) {
  return (
    <SummaryCard label="Saldo do mês" tone="orange">
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
      ) : (
        <>
          <p className="truncate font-display text-2xl font-semibold leading-none tabular-nums">
            {BRL.format(saldo)}
          </p>
          <p className="mt-2 text-sm text-success">Entradas: {BRL.format(receitas)}</p>
          <p className="text-sm text-destructive">Saídas: {BRL.format(gastos)}</p>
        </>
      )}
    </SummaryCard>
  );
}

export function ProgramsCard({
  open,
  done,
  unavailable,
}: {
  open: number;
  done: number;
  unavailable?: boolean;
}) {
  return (
    <SummaryCard label="Programações" tone="ink">
      {unavailable ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar.</p>
      ) : (
        <>
          <p className="font-display text-2xl font-semibold leading-tight">
            {open} {open === 1 ? "aberta" : "abertas"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {done} {done === 1 ? "finalizada" : "finalizadas"}
          </p>
        </>
      )}
    </SummaryCard>
  );
}
