import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  DbBanner,
  EmptyState,
  Field,
  ListTable,
  ListTableEmptyRow,
  ListTableHeadCell,
  ListTableHeaderRow,
  listTableActionCellClass,
  listTableBodyRowClass,
  listTableCellClass,
  listTableMutedCellClass,
  PageSkeleton,
  SearchField,
  SidePanel,
  TablePager,
  TableBody,
  TableCell,
  TableDeleteButton,
  TableHeader,
  TableRow,
} from "@/components/apoio-ui";
import { MobileCardapioTabs, MobileRecordCard, MobileRecordList } from "@/mobile";
import { Button } from "@/components/ui/button";
import { useMenus, type MenuWithIngredients } from "@/hooks/use-data";
import { usePagedList } from "@/hooks/use-paged-list";
import { useIsAdmin } from "@/hooks/use-session";
import { BRL } from "@/lib/apoio-utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

function parsePrepSteps(text: string | null | undefined) {
  if (!text?.trim()) return [];
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[\.)\-]\s*/, "").trim())
    .filter(Boolean);
}

function profitPercentLabel(min: number | null, charged: number | null) {
  if (min == null || charged == null || Number(min) <= 0) return "A definir";
  const pct = (Number(charged) / Number(min) - 1) * 100;
  if (!Number.isFinite(pct)) return "A definir";
  return `${(Math.round(pct * 10) / 10).toLocaleString("pt-BR")}%`;
}

export const Route = createFileRoute("/_authenticated/cardapio/")({
  ssr: false,
  component: CardapioAlimentacoesPage,
});

function CardapioAlimentacoesPage() {
  const menus = useMenus();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [menuQ, setMenuQ] = useState("");
  const [selected, setSelected] = useState<MenuWithIngredients | null>(null);

  const filteredMenus = useMemo(() => {
    const needle = menuQ.trim().toLowerCase();
    return (menus.data ?? [])
      .filter((menu) => {
        if (!needle) return true;
        const haystack = [menu.name, menu.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [menus.data, menuQ]);

  const pagedMenus = usePagedList(filteredMenus, menuQ);
  const queryClient = useQueryClient();
  const colSpan = isAdmin ? 6 : 5;
  const selectedIngredients = [...(selected?.menu_ingredients ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const selectedPrep = parsePrepSteps(selected?.prep_instructions);

  return (
    <AppShell
      wide
      actions={
        isAdmin ? (
          <Button asChild>
            <Link to="/cardapio/nova">
              <Plus className="size-4" /> Nova alimentação
            </Link>
          </Button>
        ) : undefined
      }
    >
      <MobileCardapioTabs />
      {menus.error && <DbBanner error={menus.error} />}
      {menus.isLoading ? (
        <PageSkeleton />
      ) : (menus.data ?? []).length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Cardápio vazio"
          description="Cadastre cachorro quente, strogonoff, pizza e as demais receitas da equipe."
          action={
            isAdmin ? (
              <Button asChild>
                <Link to="/cardapio/nova">
                  <Plus className="size-4" /> Nova alimentação
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <SearchField
              value={menuQ}
              onChange={setMenuQ}
              className="w-full min-w-0 flex-1 lg:w-60 lg:flex-none"
            />
            {isAdmin ? (
              <Button asChild size="icon" className="size-9 shrink-0 lg:hidden" aria-label="Nova alimentação">
                <Link to="/cardapio/nova">
                  <Plus className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
          <div className="hidden lg:block">
          <ListTable>
            <TableHeader>
              <ListTableHeaderRow>
                <ListTableHeadCell>Alimentação</ListTableHeadCell>
                <ListTableHeadCell className="hidden md:table-cell">Descrição</ListTableHeadCell>
                <ListTableHeadCell>Preço / pessoa</ListTableHeadCell>
                <ListTableHeadCell>Lucro</ListTableHeadCell>
                <ListTableHeadCell className="hidden sm:table-cell">Ingredientes</ListTableHeadCell>
                {isAdmin && <ListTableHeadCell className="w-14 px-3" />}
              </ListTableHeaderRow>
            </TableHeader>
            <TableBody>
              {pagedMenus.total === 0 ? (
                <ListTableEmptyRow colSpan={colSpan} message="Nenhum resultado com os filtros atuais." />
              ) : (
                pagedMenus.pageItems.map((menu, index) => (
                  <TableRow
                    key={menu.id}
                    className={listTableBodyRowClass(index, "cursor-pointer")}
                    onClick={() => setSelected(menu)}
                  >
                    <TableCell className={`${listTableCellClass} font-medium`}>
                      <span className="block truncate">{menu.name}</span>
                      <span className="block truncate text-xs text-muted-foreground md:hidden">
                        {menu.description ?? "Sem descrição"}
                      </span>
                    </TableCell>
                    <TableCell className={`${listTableMutedCellClass} hidden md:table-cell`}>
                      {menu.description ?? "—"}
                    </TableCell>
                    <TableCell className={`${listTableCellClass} whitespace-nowrap`}>
                      {menu.charged_price_per_person != null
                        ? BRL.format(Number(menu.charged_price_per_person))
                        : "A definir"}
                    </TableCell>
                    <TableCell className={`${listTableCellClass} whitespace-nowrap`}>
                      {profitPercentLabel(
                        menu.min_price_per_person,
                        menu.charged_price_per_person,
                      )}
                    </TableCell>
                    <TableCell className={`${listTableMutedCellClass} hidden sm:table-cell`}>
                      {menu.menu_ingredients?.length ?? 0}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className={listTableActionCellClass}>
                        <TableDeleteButton
                          title="Excluir esta alimentação?"
                          description="A receita e os ingredientes serão removidos do cardápio."
                          onConfirm={async () => {
                            const { error } = await supabase.from("menus").delete().eq("id", menu.id);
                            if (error) toast.error(error.message);
                            else {
                              toast.success("Alimentação excluída.");
                              if (selected?.id === menu.id) setSelected(null);
                              queryClient.invalidateQueries({ queryKey: ["menus"] });
                            }
                          }}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </ListTable>
          </div>
          {pagedMenus.total === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground lg:hidden">
              Nenhum resultado com os filtros atuais.
            </p>
          )}
          {pagedMenus.total > 0 && (
            <MobileRecordList>
              {pagedMenus.pageItems.map((menu) => (
                <MobileRecordCard
                  key={menu.id}
                  topLeft={menu.name}
                  bottomLeft={menu.description ?? "Sem descrição"}
                  topRight={
                    <span className="font-medium text-foreground">
                      {menu.charged_price_per_person != null
                        ? BRL.format(Number(menu.charged_price_per_person))
                        : "A definir"}
                    </span>
                  }
                  bottomRight={profitPercentLabel(
                    menu.min_price_per_person,
                    menu.charged_price_per_person,
                  )}
                  onClick={() => setSelected(menu)}
                  action={
                    isAdmin ? (
                      <TableDeleteButton
                        title="Excluir esta alimentação?"
                        description="A receita e os ingredientes serão removidos do cardápio."
                        onConfirm={async () => {
                          const { error } = await supabase.from("menus").delete().eq("id", menu.id);
                          if (error) toast.error(error.message);
                          else {
                            toast.success("Alimentação excluída.");
                            if (selected?.id === menu.id) setSelected(null);
                            queryClient.invalidateQueries({ queryKey: ["menus"] });
                          }
                        }}
                      />
                    ) : undefined
                  }
                />
              ))}
            </MobileRecordList>
          )}
          <TablePager
            page={pagedMenus.page}
            pageCount={pagedMenus.pageCount}
            onPageChange={pagedMenus.setPage}
          />
        </>
      )}

      <SidePanel
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        eyebrow="Alimentação"
        title={selected?.name ?? "Alimentação"}
        footer={
          isAdmin && selected ? (
            <Button
              className="ml-auto"
              onClick={() => navigate({ to: "/cardapio/$id", params: { id: selected.id } })}
            >
              Editar
            </Button>
          ) : undefined
        }
      >
        {selected && (
          <div className="grid gap-4">
            <Field label="Nome">
              <p className="text-sm">{selected.name}</p>
            </Field>
            <Field label="Obs">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {selected.description?.trim() || "—"}
              </p>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor por pessoa">
                <p className="text-sm">
                  {selected.charged_price_per_person != null
                    ? BRL.format(Number(selected.charged_price_per_person))
                    : "A definir"}
                </p>
              </Field>
              <Field label="Lucro">
                <p className="text-sm">
                  {profitPercentLabel(
                    selected.min_price_per_person,
                    selected.charged_price_per_person,
                  )}
                </p>
              </Field>
            </div>
            <Field label="Ingredientes">
              {selectedIngredients.length > 0 ? (
                <ul className="space-y-2">
                  {selectedIngredients.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm"
                    >
                      <span>{item.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.qty_per_person ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum ingrediente.</p>
              )}
            </Field>
            <Field label="Modo de preparo">
              {selectedPrep.length > 0 ? (
                <ol className="space-y-2">
                  {selectedPrep.map((step, index) => (
                    <li
                      key={index}
                      className="flex gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                    >
                      <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Sem instruções ainda.</p>
              )}
            </Field>
          </div>
        )}
      </SidePanel>
    </AppShell>
  );
}
