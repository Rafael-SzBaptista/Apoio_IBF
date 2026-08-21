import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Wallet } from "lucide-react";
import { DatePicker } from "@/components/date-time-fields";
import { FileField, StoredFileButton } from "@/components/file-field";
import { AppShell } from "@/components/app-shell";
import { DbBanner, EmptyState, Field, PageSkeleton, SearchField, SidePanel, TableDeleteButton, TablePager } from "@/components/apoio-ui";
import { MobileRecordCard, MobileRecordList } from "@/mobile";
import { SummaryDonut } from "@/components/summary-donut";
import { FinanceMonthlyChart } from "@/components/finance-monthly-chart.lazy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { removePrivateFile, uploadPrivateFile } from "@/lib/storage";
import { useEvents, useFinance, type FinanceListItem } from "@/hooks/use-data";
import { usePagedList } from "@/hooks/use-paged-list";
import { useIsAdmin, useSession } from "@/hooks/use-session";
import { REIMBURSEMENT, reimbursementLabel } from "@/lib/constants";
import { BRL, foldText, todayIso } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/financeiro")({
  ssr: false,
  component: FinanceiroPage,
});

const emptyForm = {
  description: "",
  cost: "",
  collected: "",
  entry_date: todayIso(),
  event_id: "",
  reimbursement_status: "pendente",
};

function parseAmount(value: string) {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isPendingReimbursement(row: FinanceListItem) {
  return row.kind === "gasto" && (row.reimbursement_status === "pendente" || row.reimbursement_status === "solicitado");
}

function ReimbursementBadge({ status }: { status: string }) {
  const tone =
    status === "reembolsado"
      ? "border-success/25 bg-success/15 text-success"
      : status === "pendente"
        ? "border-chart-5/30 bg-chart-5/15 text-chart-5"
        : status === "solicitado"
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-transparent bg-secondary text-secondary-foreground";
  return (
    <Badge variant="outline" className={cn("font-medium", tone)}>
      {reimbursementLabel(status)}
    </Badge>
  );
}

function FinanceiroPage() {
  const finance = useFinance();
  const events = useEvents();
  const isAdmin = useIsAdmin();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const tableRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceListItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [keepReceipt, setKeepReceipt] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [eventId, setEventId] = useState("all");
  const [q, setQ] = useState("");
  const [reimbursement, setReimbursement] = useState("all");

  const rows = finance.data ?? [];
  const years = useMemo(() => {
    const found = new Set(rows.map((row) => row.entry_date.slice(0, 4)));
    found.add(String(new Date().getFullYear()));
    return [...found].sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const yearRows = useMemo(() => {
    return rows.filter((row) => {
      if (!row.entry_date.startsWith(year)) return false;
      if (eventId !== "all" && row.event_id !== eventId) return false;
      return true;
    });
  }, [rows, year, eventId]);

  const previousYearRows = useMemo(() => {
    const previous = String(Number(year) - 1);
    return rows.filter((row) => {
      if (!row.entry_date.startsWith(previous)) return false;
      if (eventId !== "all" && row.event_id !== eventId) return false;
      return true;
    });
  }, [rows, year, eventId]);

  const gastos = yearRows.filter((r) => r.kind === "gasto").reduce((s, r) => s + Number(r.amount), 0);
  const receitas = yearRows.filter((r) => r.kind === "receita").reduce((s, r) => s + Number(r.amount), 0);
  const previousReceitas = previousYearRows
    .filter((r) => r.kind === "receita")
    .reduce((s, r) => s + Number(r.amount), 0);
  const receitaDelta =
    previousReceitas > 0 ? ((receitas - previousReceitas) / previousReceitas) * 100 : null;
  const pending = yearRows.filter(isPendingReimbursement);
  const tableRows = useMemo(() => {
    const needle = foldText(q.trim());
    return yearRows.filter((row) => {
      if (reimbursement !== "all" && row.reimbursement_status !== reimbursement) return false;
      if (!needle) return true;
      const haystack = foldText(
        [
          row.description,
          row.events?.title,
          row.entry_date.split("-").reverse().join("/"),
          BRL.format(Number(row.amount)),
          reimbursementLabel(row.reimbursement_status),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(needle);
    });
  }, [yearRows, q, reimbursement]);
  const paged = usePagedList(tableRows, `${year}|${eventId}|${q}|${reimbursement}`);

  const chart = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const slice = yearRows.filter((r) => r.entry_date.startsWith(key));
      const month = new Date(`${key}-01`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      return {
        mes: month.charAt(0).toUpperCase() + month.slice(1),
        gastos: slice.filter((r) => r.kind === "gasto").reduce((s, r) => s + Number(r.amount), 0),
        receitas: slice.filter((r) => r.kind === "receita").reduce((s, r) => s + Number(r.amount), 0),
      };
    });
  }, [yearRows, year]);

  const eventOptions = useMemo(() => {
    const fromEntries = rows
      .filter((row) => row.events?.title)
      .map((row) => ({ id: row.event_id!, title: row.events!.title }));
    const fromEvents = (events.data ?? []).map((event) => ({ id: event.id, title: event.title }));
    const map = new Map<string, string>();
    for (const item of [...fromEvents, ...fromEntries]) map.set(item.id, item.title);
    return [...map.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }, [rows, events.data]);

  const costAmount = parseAmount(form.cost);
  const collectedAmount = parseAmount(form.collected);
  const profitAmount = collectedAmount - costAmount;

  const closePanel = () => {
    setOpen(false);
    setEditing(null);
    setFile(null);
    setKeepReceipt(true);
    setForm({ ...emptyForm, entry_date: todayIso() });
  };

  const openNew = () => {
    setEditing(null);
    setFile(null);
    setKeepReceipt(true);
    setForm({ ...emptyForm, entry_date: todayIso() });
    setOpen(true);
  };

  const openEdit = (row: FinanceListItem) => {
    setEditing(row);
    setFile(null);
    setKeepReceipt(true);
    setForm({
      description: row.description ?? "",
      cost: row.kind === "gasto" ? String(Number(row.amount)) : "",
      collected: row.kind === "receita" ? String(Number(row.amount)) : "",
      entry_date: row.entry_date,
      event_id: row.event_id ?? "",
      reimbursement_status: row.kind === "gasto" ? row.reimbursement_status : "pendente",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!isAdmin) return;
    if (editing) {
      const amount = editing.kind === "gasto" ? costAmount : collectedAmount;
      if (amount <= 0) {
        toast.error(editing.kind === "gasto" ? "Informe o custo real." : "Informe o arrecadamento real.");
        return;
      }
      const previousReceipt = editing.receipt_path;
      let receipt_path = keepReceipt ? previousReceipt : null;
      if (file) {
        try {
          receipt_path = await uploadPrivateFile("notas", file);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Não foi possível enviar a nota fiscal.");
          return;
        }
      }
      const { error } = await supabase
        .from("finance_entries")
        .update({
          description: form.description.trim(),
          amount,
          entry_date: form.entry_date,
          event_id: form.event_id || null,
          reimbursement_status: editing.kind === "gasto" ? form.reimbursement_status : "nao_aplicavel",
          receipt_path,
        })
        .eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (previousReceipt && previousReceipt !== receipt_path) {
        await removePrivateFile("notas", previousReceipt);
      }
      toast.success("Lançamento atualizado.");
      closePanel();
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      return;
    }
    if (costAmount <= 0 && collectedAmount <= 0) {
      toast.error("Informe o custo real ou o arrecadamento real.");
      return;
    }
    let receipt_path: string | null = null;
    if (file) {
      try {
        receipt_path = await uploadPrivateFile("notas", file);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar a nota fiscal.");
        return;
      }
    }
    const description = form.description.trim();
    const base = {
      entry_date: form.entry_date,
      event_id: form.event_id || null,
      created_by: session?.user.id ?? null,
    };
    const both = costAmount > 0 && collectedAmount > 0;
    const rowsToInsert = [
      ...(costAmount > 0
        ? [
            {
              ...base,
              description: both && description ? `${description} · custo` : description,
              amount: costAmount,
              kind: "gasto",
              reimbursement_status: form.reimbursement_status,
              receipt_path,
            },
          ]
        : []),
      ...(collectedAmount > 0
        ? [
            {
              ...base,
              description: both && description ? `${description} · arrecadação` : description,
              amount: collectedAmount,
              kind: "receita",
              reimbursement_status: "nao_aplicavel",
              receipt_path: costAmount > 0 ? null : receipt_path,
            },
          ]
        : []),
    ];
    const { error } = await supabase.from("finance_entries").insert(rowsToInsert);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lançamento registrado.");
    closePanel();
    queryClient.invalidateQueries({ queryKey: ["finance"] });
  };

  return (
    <AppShell wide>
      {finance.error && <DbBanner error={finance.error} />}
      {finance.isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="hidden font-display text-2xl font-semibold lg:block">Financeiro</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 w-[4.75rem] shrink-0 px-2.5 text-xs sm:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger className="h-9 min-w-0 flex-1 px-2.5 text-xs sm:h-8 sm:w-[12.25rem] sm:flex-none">
                  <SelectValue placeholder="Todas as programações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as programações</SelectItem>
                  {eventOptions.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <>
                  <Button
                    size="icon"
                    className="size-9 shrink-0 sm:hidden"
                    aria-label="Novo lançamento"
                    onClick={openNew}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button className="hidden sm:inline-flex" onClick={openNew}>
                    <Plus className="size-4" /> Novo lançamento
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card
            key={year}
            className="p-4 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
          >
            <div className="grid gap-6 sm:grid-cols-3">
              <SummaryDonut
                label={`Receita ${year}`}
                display={BRL.format(receitas)}
                fill="var(--color-success)"
                caption={
                  receitaDelta == null
                    ? `sem dados de ${Number(year) - 1}`
                    : `${receitaDelta >= 0 ? "+" : ""}${receitaDelta.toFixed(0)}% vs ${Number(year) - 1}`
                }
                captionClassName={
                  receitaDelta == null
                    ? "text-muted-foreground"
                    : receitaDelta >= 0
                      ? "text-success"
                      : "text-destructive"
                }
              />
              <SummaryDonut
                delayMs={120}
                label={`Gastos ${year}`}
                display={BRL.format(gastos)}
                fill="var(--color-primary)"
                caption={`${pending.length} ${pending.length === 1 ? "reembolso pendente" : "reembolsos pendentes"}`}
              />
              <SummaryDonut
                delayMs={240}
                label={`Saldo ${year}`}
                display={BRL.format(receitas - gastos)}
                fill={receitas - gastos >= 0 ? "var(--color-success)" : "var(--color-primary)"}
                caption="caixa atual"
              />
            </div>
          </Card>

          <div className="grid items-start gap-8 lg:grid-cols-3">
            <div className="hidden min-w-0 lg:col-span-2 lg:block">
              <h2 className="font-display text-lg font-semibold">Balanço mensal</h2>
              <FinanceMonthlyChart data={chart} />
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold">Reembolsos pendentes</h2>
              {pending.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum reembolso pendente.</p>
              ) : (
                <>
                  <div
                    className={cn(
                      "mt-3 hidden space-y-1 lg:block",
                      pending.length > 5 && "max-h-[21.25rem] overflow-y-auto pr-1",
                    )}
                  >
                    {pending.map((row) => (
                      <div
                        key={row.id}
                        className="flex cursor-pointer items-start justify-between gap-3 border-b py-2.5 last:border-b-0 hover:bg-secondary/50"
                        onClick={() => openEdit(row)}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.description}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.events?.title ?? "Sem programação"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium">{BRL.format(Number(row.amount))}</p>
                          <div className="mt-1 flex justify-end">
                            <ReimbursementBadge status={row.reimbursement_status} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <MobileRecordList>
                      {pending.map((row) => (
                        <MobileRecordCard
                          key={row.id}
                          topLeft={row.description}
                          bottomLeft={row.events?.title ?? "Sem programação"}
                          topRight={
                            <span className="font-medium">{BRL.format(Number(row.amount))}</span>
                          }
                          bottomRight={<ReimbursementBadge status={row.reimbursement_status} />}
                          onClick={() => openEdit(row)}
                        />
                      ))}
                    </MobileRecordList>
                  </div>
                </>
              )}
            </div>
          </div>

          {yearRows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Nenhum lançamento"
              description="Registre compras, contribuições e o status de reembolso de cada nota."
              action={
                isAdmin ? (
                  <Button onClick={openNew}>
                    <Plus className="size-4" /> Novo lançamento
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div ref={tableRef} className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Lançamentos</h2>
              <div className="flex flex-wrap items-center justify-start gap-2">
                <SearchField value={q} onChange={setQ} />
                <Select value={reimbursement} onValueChange={setReimbursement}>
                  <SelectTrigger className="w-auto min-w-44">
                    <SelectValue placeholder="Reembolso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as situações</SelectItem>
                    {REIMBURSEMENT.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-y">
                      <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                        Data
                      </th>
                      <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                        Descrição
                      </th>
                      <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                        Programação
                      </th>
                      <th className="h-10 py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide">
                        Valor
                      </th>
                      <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                        Reembolso
                      </th>
                      <th className="h-10 w-20 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.total === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                          Nenhum lançamento com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                    paged.pageItems.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-b last:border-b-0 hover:bg-secondary/50"
                        onClick={() => openEdit(row)}
                      >
                        <td className="py-2.5 pr-4">{row.entry_date.split("-").reverse().join("/")}</td>
                        <td className="py-2.5 pr-4">{row.description}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{row.events?.title ?? "—"}</td>
                        <td className="py-2.5 pr-4 text-right">
                          <span
                            className={cn(
                              "font-medium",
                              row.kind === "gasto" ? "text-primary" : "text-success",
                            )}
                          >
                            {row.kind === "gasto" ? "− " : "+ "}
                            {BRL.format(Number(row.amount))}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4" onClick={(event) => event.stopPropagation()}>
                          {isAdmin && row.kind === "gasto" ? (
                            <Select
                              value={row.reimbursement_status}
                              onValueChange={async (value) => {
                                const { error } = await supabase
                                  .from("finance_entries")
                                  .update({ reimbursement_status: value })
                                  .eq("id", row.id);
                                if (error) toast.error(error.message);
                                else queryClient.invalidateQueries({ queryKey: ["finance"] });
                              }}
                            >
                              <SelectTrigger className="h-7 w-auto min-w-[7.5rem] px-2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {REIMBURSEMENT.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <ReimbursementBadge status={row.reimbursement_status} />
                          )}
                        </td>
                        <td className="py-2.5" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            {row.receipt_path ? (
                              <StoredFileButton bucket="notas" path={row.receipt_path} label="Ver nota fiscal" />
                            ) : null}
                            {isAdmin && (
                              <TableDeleteButton
                                title="Excluir este lançamento?"
                                description="O registro será removido do financeiro. Essa ação não pode ser desfeita."
                                onConfirm={async () => {
                                  if (row.receipt_path) {
                                    await supabase.storage.from("notas").remove([row.receipt_path]);
                                  }
                                  const { error } = await supabase
                                    .from("finance_entries")
                                    .delete()
                                    .eq("id", row.id);
                                  if (error) toast.error(error.message);
                                  else {
                                    toast.success("Lançamento excluído.");
                                    queryClient.invalidateQueries({ queryKey: ["finance"] });
                                  }
                                }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
              {paged.total === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground lg:hidden">
                  Nenhum lançamento com os filtros atuais.
                </p>
              )}
              {paged.total > 0 && (
                <MobileRecordList>
                  {paged.pageItems.map((row) => (
                    <MobileRecordCard
                      key={row.id}
                      topLeft={row.description}
                      bottomLeft={row.events?.title ?? "Sem programação"}
                      topRight={
                        <span
                          className={cn(
                            "font-medium",
                            row.kind === "gasto" ? "text-primary" : "text-success",
                          )}
                        >
                          {row.kind === "gasto" ? "− " : "+ "}
                          {BRL.format(Number(row.amount))}
                        </span>
                      }
                      bottomRight={row.entry_date.split("-").reverse().join("/")}
                      onClick={() => openEdit(row)}
                      action={
                        isAdmin ? (
                          <TableDeleteButton
                            title="Excluir este lançamento?"
                            description="O registro será removido do financeiro. Essa ação não pode ser desfeita."
                            onConfirm={async () => {
                              if (row.receipt_path) {
                                await supabase.storage.from("notas").remove([row.receipt_path]);
                              }
                              const { error } = await supabase
                                .from("finance_entries")
                                .delete()
                                .eq("id", row.id);
                              if (error) toast.error(error.message);
                              else {
                                toast.success("Lançamento excluído.");
                                queryClient.invalidateQueries({ queryKey: ["finance"] });
                              }
                            }}
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </MobileRecordList>
              )}
              {paged.showPager && (
                <TablePager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
              )}
            </div>
          )}
        </div>
      )}

      <SidePanel
        open={open}
        onOpenChange={(next) => {
          if (next) setOpen(true);
          else closePanel();
        }}
        eyebrow="Detalhes do lançamento"
        title={editing ? "Editar lançamento" : "Novo lançamento"}
        footer={
          isAdmin ? (
            <>
              <Button type="button" variant="ghost" onClick={closePanel}>
                Cancelar
              </Button>
              <Button onClick={save}>Salvar alterações</Button>
            </>
          ) : (
            <Button type="button" variant="ghost" onClick={closePanel}>
              Fechar
            </Button>
          )
        }
      >
        <div className="grid gap-4">
          <Field label="Programação (opcional)">
            <Select
              value={form.event_id || "none"}
              onValueChange={(value) => setForm({ ...form, event_id: value === "none" ? "" : value })}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vincular a um evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem programação</SelectItem>
                {(events.data ?? []).map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.event_date} · {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição">
            <Input
              value={form.description}
              maxLength={200}
              disabled={!isAdmin}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {(!editing || editing.kind === "gasto") && (
            <Field label="Custo real">
              <Input
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                value={form.cost}
                disabled={!isAdmin}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </Field>
          )}
          {(!editing || editing.kind === "receita") && (
            <Field label="Arrecadamento real">
              <Input
                type="number"
                step="0.01"
                min={0}
                inputMode="decimal"
                value={form.collected}
                disabled={!isAdmin}
                onChange={(e) => setForm({ ...form, collected: e.target.value })}
              />
            </Field>
          )}
          {!editing && (
            <Field label="Lucro real">
              <Input readOnly value={BRL.format(profitAmount)} />
              <p className="text-xs text-muted-foreground">Arrecadamento real − custo real</p>
            </Field>
          )}
          <Field label="Data">
            <DatePicker
              value={form.entry_date}
              disabled={!isAdmin}
              onChange={(value) => setForm({ ...form, entry_date: value })}
            />
          </Field>
          {(editing?.kind === "gasto" || (!editing && costAmount > 0)) && (
            <Field label="Reembolso">
              <Select
                value={form.reimbursement_status}
                onValueChange={(value) => setForm({ ...form, reimbursement_status: value })}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REIMBURSEMENT.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <FileField
            label="Nota fiscal (foto ou PDF)"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf"
            file={file}
            onFileChange={setFile}
            storedPath={keepReceipt ? editing?.receipt_path : null}
            storedBucket="notas"
            onClearStored={isAdmin ? () => setKeepReceipt(false) : undefined}
          />
        </div>
      </SidePanel>
    </AppShell>
  );
}
