export const ASSIGNMENT_AREAS = [
  { value: "decoracao", label: "Decoração" },
  { value: "alimentacao", label: "Alimentação" },
] as const;

/** Escalas antigas sem área específica. */
export const ASSIGNMENT_AREA = "equipe";

export function assignmentAreaLabel(value: string) {
  if (value === ASSIGNMENT_AREA) return "Equipe";
  return ASSIGNMENT_AREAS.find((area) => area.value === value)?.label ?? value;
}

export const SECTORS = [
  "Papelaria",
  "Iluminação",
  "Vasos e plantas",
  "Artigos de esporte",
  "Fantasias",
  "Decoração ambiente",
] as const;

export const EVENT_STATUS = [
  { value: "aberta", label: "Aberta" },
  { value: "concluida", label: "Concluída" },
] as const;

export function isEventCompleted(status: string) {
  return status === "concluida" || status === "realizada";
}

export function eventStatusValue(status: string) {
  return isEventCompleted(status) ? "concluida" : "aberta";
}

export const REIMBURSEMENT = [
  { value: "nao_aplicavel", label: "Não se aplica" },
  { value: "pendente", label: "Pendente" },
  { value: "solicitado", label: "Solicitado" },
  { value: "reembolsado", label: "Reembolsado" },
] as const;

export const ENTRY_KINDS = [
  { value: "gasto", label: "Gasto" },
  { value: "receita", label: "Receita" },
] as const;

export const DEFAULT_TASKS = [
  "Levantar quantidade de pessoas",
  "Comprar ingredientes",
  "Preparar o alimento",
  "Decorar o local",
  "Servir",
  "Limpar e guardar",
  "Guardar nota fiscal e pedir reembolso",
] as const;

/** 15% na planilha: cobre cerca de 3 pessoas a mais sem prejuízo se não vender. */
export const SAFETY_TAX = 1.15;
export const SAFETY_TAX_PERCENT = Math.round((SAFETY_TAX - 1) * 100);

export function eventColor(title: string) {
  const key = title.toLowerCase();
  if (key.includes("conecte") || key.includes("culto")) return "bg-primary/15 text-primary";
  if (key.includes("jogo") || key.includes("pipoca")) return "bg-accent/15 text-accent";
  if (key.includes("acampa")) return "bg-[var(--chart-3)]/20 text-foreground";
  if (key.includes("coffee") || key.includes("líder"))
    return "bg-[var(--chart-4)]/20 text-foreground";
  return "bg-secondary text-secondary-foreground";
}

export function statusLabel(value: string) {
  return isEventCompleted(value) ? "Concluída" : "Aberta";
}

export function reimbursementLabel(value: string) {
  return REIMBURSEMENT.find((s) => s.value === value)?.label ?? value;
}
