export function DashboardHeader({
  greeting,
  name,
  dateLabel,
}: {
  greeting: string;
  name: string | null;
  dateLabel: string;
}) {
  return (
    <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Veja o que precisa da sua atenção hoje.</p>
      </div>
      <p className="text-sm text-muted-foreground sm:pb-0.5 sm:text-right">{dateLabel}</p>
    </header>
  );
}
