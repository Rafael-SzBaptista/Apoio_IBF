import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  EmptyState,
  Field,
  ListTable,
  ListTableEmptyRow,
  ListTableHeadCell,
  ListTableHeaderRow,
  listTableBodyRowClass,
  listTableCellClass,
  listTableMutedCellClass,
  listTableActionCellClass,
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
import { MobileRecordCard, MobileRecordList } from "@/mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrices } from "@/hooks/use-data";
import { usePagedList } from "@/hooks/use-paged-list";
import { useIsAdmin } from "@/hooks/use-session";
import { BRL } from "@/lib/apoio-utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/cardapio/precos")({
  ssr: false,
  component: CardapioPrecosPage,
});

type PriceRow = Tables<"ingredient_prices">;

const emptyPriceForm = {
  name: "",
  pack_quantity: "",
  unit: "g",
  price: "",
  where_to_buy: "",
};

function CardapioPrecosPage() {
  const prices = usePrices();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();
  const [priceQ, setPriceQ] = useState("");
  const [priceOpen, setPriceOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceRow | null>(null);
  const [priceForm, setPriceForm] = useState(emptyPriceForm);
  const [saving, setSaving] = useState(false);

  const refreshPrices = () => queryClient.invalidateQueries({ queryKey: ["ingredient-prices"] });

  const filteredPrices = useMemo(() => {
    const needle = priceQ.trim().toLowerCase();
    return (prices.data ?? [])
      .filter((row) => {
        if (!needle) return true;
        const haystack = [row.name, row.unit, row.where_to_buy]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [prices.data, priceQ]);

  const pagedPrices = usePagedList(filteredPrices, priceQ);

  const openNewPrice = () => {
    setEditingPrice(null);
    setPriceForm(emptyPriceForm);
    setPriceOpen(true);
  };

  const openEditPrice = (row: PriceRow) => {
    setEditingPrice(row);
    setPriceForm({
      name: row.name,
      pack_quantity: String(row.pack_quantity),
      unit: row.unit,
      price: String(row.price),
      where_to_buy: row.where_to_buy ?? "",
    });
    setPriceOpen(true);
  };

  const savePrice = async () => {
    const name = priceForm.name.trim();
    const unit = priceForm.unit.trim();
    const pack_quantity = Number(String(priceForm.pack_quantity).replace(",", "."));
    const price = Number(String(priceForm.price).replace(",", "."));
    if (!name || !unit || !Number.isFinite(pack_quantity) || !Number.isFinite(price)) {
      toast.error("Preencha nome, quantidade da embalagem, unidade e preço.");
      return;
    }
    setSaving(true);
    const payload = {
      name,
      pack_quantity,
      unit,
      price,
      where_to_buy: priceForm.where_to_buy.trim() || null,
    };
    const { error } = editingPrice
      ? await supabase.from("ingredient_prices").update(payload).eq("id", editingPrice.id)
      : await supabase.from("ingredient_prices").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingPrice ? "Preço atualizado." : "Preço cadastrado.");
    setPriceOpen(false);
    refreshPrices();
  };

  return (
    <AppShell
      wide
      actions={
        isAdmin ? (
          <Button onClick={openNewPrice}>
            <Plus className="size-4" /> Novo preço
          </Button>
        ) : undefined
      }
    >
      {prices.isLoading ? (
        <PageSkeleton />
      ) : (prices.data ?? []).length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhum preço cadastrado"
          description="Cadastre os valores dos ingredientes para calcular o custo das alimentações."
          action={
            isAdmin ? (
              <Button onClick={openNewPrice}>
                <Plus className="size-4" /> Novo preço
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <SearchField value={priceQ} onChange={setPriceQ} />
          </div>
          <div className="hidden lg:block">
          <ListTable>
            <TableHeader>
              <ListTableHeaderRow>
                <ListTableHeadCell>Ingrediente</ListTableHeadCell>
                <ListTableHeadCell>Embalagem</ListTableHeadCell>
                <ListTableHeadCell>Preço</ListTableHeadCell>
                <ListTableHeadCell className="hidden md:table-cell">Onde</ListTableHeadCell>
                {isAdmin && <ListTableHeadCell className="w-14 px-3" />}
              </ListTableHeaderRow>
            </TableHeader>
            <TableBody>
              {pagedPrices.total === 0 ? (
                <ListTableEmptyRow
                  colSpan={isAdmin ? 5 : 4}
                  message="Nenhum resultado com os filtros atuais."
                />
              ) : (
                pagedPrices.pageItems.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={listTableBodyRowClass(index, isAdmin ? "cursor-pointer" : undefined)}
                    onClick={() => isAdmin && openEditPrice(row)}
                  >
                    <TableCell className={listTableCellClass}>
                      <p className="truncate font-medium">{row.name}</p>
                    </TableCell>
                    <TableCell className={`${listTableCellClass} whitespace-nowrap`}>
                      {row.pack_quantity} {row.unit}
                    </TableCell>
                    <TableCell className={`${listTableCellClass} whitespace-nowrap`}>
                      {BRL.format(Number(row.price))}
                    </TableCell>
                    <TableCell className={`${listTableMutedCellClass} hidden md:table-cell`}>
                      {row.where_to_buy ?? "—"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className={listTableActionCellClass}>
                        <TableDeleteButton
                          title="Excluir este preço?"
                          description="O ingrediente será removido da tabela de preços."
                          onConfirm={async () => {
                            const { error } = await supabase
                              .from("ingredient_prices")
                              .delete()
                              .eq("id", row.id);
                            if (error) toast.error(error.message);
                            else {
                              toast.success("Preço excluído.");
                              refreshPrices();
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
          {pagedPrices.total === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground lg:hidden">
              Nenhum resultado com os filtros atuais.
            </p>
          )}
          {pagedPrices.total > 0 && (
            <MobileRecordList>
              {pagedPrices.pageItems.map((row) => (
                <MobileRecordCard
                  key={row.id}
                  topLeft={row.name}
                  bottomLeft={row.where_to_buy ?? "—"}
                  topRight={
                    <span className="font-medium text-foreground">{BRL.format(Number(row.price))}</span>
                  }
                  bottomRight={`${row.pack_quantity} ${row.unit}`}
                  onClick={() => openEditPrice(row)}
                />
              ))}
            </MobileRecordList>
          )}
          <TablePager
            page={pagedPrices.page}
            pageCount={pagedPrices.pageCount}
            onPageChange={pagedPrices.setPage}
          />
        </>
      )}

      <SidePanel
        open={priceOpen}
        onOpenChange={setPriceOpen}
        eyebrow="Tabela de preços"
        title={editingPrice ? "Editar preço" : "Novo preço"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setPriceOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={savePrice}>
              Salvar alterações
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Ingrediente">
            <Input
              value={priceForm.name}
              maxLength={120}
              onChange={(e) => setPriceForm({ ...priceForm, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qtd. da embalagem">
              <Input
                type="number"
                value={priceForm.pack_quantity}
                onChange={(e) => setPriceForm({ ...priceForm, pack_quantity: e.target.value })}
              />
            </Field>
            <Field label="Unidade">
              <Input
                value={priceForm.unit}
                maxLength={20}
                onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Preço (R$)">
            <Input
              type="number"
              step="0.01"
              value={priceForm.price}
              onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
            />
          </Field>
          <Field label="Onde comprar">
            <Input
              value={priceForm.where_to_buy}
              maxLength={120}
              onChange={(e) => setPriceForm({ ...priceForm, where_to_buy: e.target.value })}
            />
          </Field>
        </div>
      </SidePanel>
    </AppShell>
  );
}
