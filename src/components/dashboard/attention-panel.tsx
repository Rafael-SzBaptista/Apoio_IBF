import { Link } from "@tanstack/react-router";
import { Check, ClipboardList, Package, Receipt, UserX, type LucideIcon } from "lucide-react";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import type { AttentionItem } from "@/components/dashboard/model";

const ICONS: Record<AttentionItem["tone"], LucideIcon> = {
  reimbursement: Receipt,
  missing: UserX,
  incomplete: ClipboardList,
  stock: Package,
};

function AttentionLink({ item }: { item: AttentionItem }) {
  const Icon = ICONS[item.tone];
  const className =
    "flex items-start gap-3 rounded-lg px-2 py-2 text-sm leading-snug transition-colors hover:bg-muted/70";
  const content = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>{item.text}</span>
    </>
  );

  if (item.to === "event") {
    return (
      <Link to="/programacoes/$id" params={{ id: item.eventId }} className={className}>
        {content}
      </Link>
    );
  }

  if (item.to === "finance") {
    return (
      <Link to="/financeiro" className={className}>
        {content}
      </Link>
    );
  }

  return (
    <Link to="/almoxarifado" className={className}>
      {content}
    </Link>
  );
}

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <DashboardSection title="Precisa de atenção" tone="magenta">
      {items.length === 0 ? (
        <div className="flex items-start gap-3 px-1 py-1">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-sm font-medium">Nenhuma pendência importante</p>
            <p className="mt-1 text-sm text-muted-foreground">Tudo está organizado por enquanto.</p>
          </div>
        </div>
      ) : (
        <ul className="-mx-2 max-h-80 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <AttentionLink item={item} />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
