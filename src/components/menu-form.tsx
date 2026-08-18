import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/apoio-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { MenuIngredientRow, MenuWithIngredients } from "@/hooks/use-data";
import { usePrices } from "@/hooks/use-data";
import {
  BRL,
  buildShoppingList,
  costPerPerson,
  findPriceMatch,
  foldText,
  formatQtyPerPerson,
  minPricePerPerson,
  parseQuantity,
  qtyNumberPart,
} from "@/lib/apoio-utils";
import { useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

function parsePercent(value: string) {
  const n = Number(value.trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function chargedFromProfit(minPrice: number, profitPercent: number) {
  if (minPrice <= 0) return null;
  return Math.round(minPrice * (1 + profitPercent / 100) * 100) / 100;
}

function profitFromCharged(minPrice: number, charged: number) {
  if (minPrice <= 0) return 0;
  return Math.round((charged / minPrice - 1) * 1000) / 10;
}

function parseMoney(value: string) {
  const cleaned = value.replace(/[R$\s]/gi, "").trim();
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatMoneyDraft(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function formatPercentDraft(value: number) {
  return String(value).replace(".", ",");
}

function parsePrepSteps(text: string | null | undefined) {
  if (!text?.trim()) return [];
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s*\d+[\.)\-]\s*/, "").trim())
    .filter(Boolean);
}

function serializePrepSteps(steps: string[], draft = "") {
  const clean = [...steps, draft].map((step) => step.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  return clean.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

type DraftIngredient = {
  id: string;
  name: string;
  qty_per_person: string | null;
  where_to_buy: string | null;
  kind: string;
  notes: string | null;
  sort_order: number;
};

function toDraft(item: MenuIngredientRow): DraftIngredient {
  return {
    id: item.id,
    name: item.name,
    qty_per_person: item.qty_per_person,
    where_to_buy: item.where_to_buy,
    kind: item.kind,
    notes: item.notes,
    sort_order: item.sort_order,
  };
}

export function MenuForm({
  menu,
  isAdmin,
}: {
  menu: MenuWithIngredients | null;
  isAdmin: boolean;
}) {
  const isCreate = menu === null;
  const menuId = menu?.id;
  const prices = usePrices();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [profitPct, setProfitPct] = useState("15");
  const [chargedDraft, setChargedDraft] = useState("");
  const [priceSource, setPriceSource] = useState<"profit" | "charged">("profit");
  const [chargedFocused, setChargedFocused] = useState(false);
  const [details, setDetails] = useState({ name: "", description: "" });
  const [prepSteps, setPrepSteps] = useState<string[]>([]);
  const [prepDraft, setPrepDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [localIngredients, setLocalIngredients] = useState<DraftIngredient[]>([]);
  const [ing, setIng] = useState({ name: "", qty_per_person: "", where_to_buy: "" });
  const [ingOpen, setIngOpen] = useState(false);

  const refresh = () => {
    if (menuId) queryClient.invalidateQueries({ queryKey: ["menu", menuId] });
    queryClient.invalidateQueries({ queryKey: ["menus"] });
  };

  useEffect(() => {
    if (!menu) return;
    setDetails({
      name: menu.name,
      description: menu.description ?? "",
    });
    setPrepSteps(parsePrepSteps(menu.prep_instructions));
    setPrepDraft("");
    if (prices.isLoading) return;
    const min = minPricePerPerson(menu.menu_ingredients ?? [], prices.data ?? []);
    const charged = menu.charged_price_per_person;
    if (charged != null && Number(charged) > 0) {
      setChargedDraft(formatMoneyDraft(Number(charged)));
      setPriceSource("charged");
      if (min > 0) {
        setProfitPct(formatPercentDraft(profitFromCharged(min, Number(charged))));
      }
    } else if (min > 0) {
      const next = chargedFromProfit(min, parsePercent(profitPct));
      setChargedDraft(next != null ? formatMoneyDraft(next) : "");
      setPriceSource("profit");
    }
  }, [menu?.id, prices.isLoading]);

  const catalog = prices.data ?? [];
  const ingredients = isCreate
    ? localIngredients
    : [...(menu?.menu_ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(toDraft);
  const shopping = buildShoppingList(ingredients, 1, catalog);
  const computedMin = minPricePerPerson(ingredients, catalog);
  const parsedCharged = parseMoney(chargedDraft);
  const suggestedCharged =
    priceSource === "charged" && parsedCharged != null
      ? parsedCharged
      : chargedFromProfit(computedMin, parsePercent(profitPct));

  useEffect(() => {
    if (priceSource === "profit") {
      const next = chargedFromProfit(computedMin, parsePercent(profitPct));
      setChargedDraft(next != null ? formatMoneyDraft(next) : "");
      return;
    }
    if (computedMin > 0 && parsedCharged != null) {
      setProfitPct(formatPercentDraft(profitFromCharged(computedMin, parsedCharged)));
    }
  }, [computedMin]);

  const usedNames = new Set(ingredients.map((item) => foldText(item.name)));
  const priceMatches = catalog
    .filter((price) => !usedNames.has(foldText(price.name)))
    .filter((price) => {
      const needle = foldText(ing.name.trim());
      if (!needle) return true;
      return (
        foldText(price.name).includes(needle) ||
        foldText(price.where_to_buy ?? "").includes(needle)
      );
    })
    .slice(0, 12);

  const selectedPrice =
    catalog.find((price) => foldText(price.name) === foldText(ing.name.trim())) ?? null;
  const draftCost = costPerPerson(
    formatQtyPerPerson(ing.qty_per_person, selectedPrice?.unit),
    selectedPrice,
  );

  const persistMinPrice = async (
    next: { name: string; qty_per_person: string | null }[],
  ) => {
    if (!menuId) return;
    const min = minPricePerPerson(next, catalog);
    const charged =
      priceSource === "charged" && parsedCharged != null
        ? parsedCharged
        : chargedFromProfit(min, parsePercent(profitPct));
    await supabase
      .from("menus")
      .update({
        min_price_per_person: min > 0 ? min : null,
        charged_price_per_person: charged,
      })
      .eq("id", menuId);
  };

  const saveMenu = async () => {
    const name = details.name.trim();
    if (!name) {
      toast.error("Informe o nome da alimentação.");
      return;
    }
    setSaving(true);
    const payload = {
      name,
      description: details.description.trim() || null,
      prep_instructions: serializePrepSteps(prepSteps, prepDraft),
      min_price_per_person: computedMin > 0 ? computedMin : null,
      charged_price_per_person: suggestedCharged,
    };

    if (isCreate) {
      const { data, error } = await supabase.from("menus").insert(payload).select("id").single();
      if (error || !data) {
        setSaving(false);
        toast.error(error?.message ?? "Não foi possível criar a alimentação.");
        return;
      }
      if (localIngredients.length > 0) {
        const { error: ingError } = await supabase.from("menu_ingredients").insert(
          localIngredients.map((item, index) => ({
            menu_id: data.id,
            name: item.name,
            qty_per_person: item.qty_per_person,
            where_to_buy: item.where_to_buy,
            notes: null,
            sort_order: index + 1,
          })),
        );
        if (ingError) {
          setSaving(false);
          toast.error(ingError.message);
          return;
        }
      }
      setSaving(false);
      toast.success("Alimentação criada.");
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      navigate({ to: "/cardapio/$id", params: { id: data.id } });
      return;
    }

    const { error } = await supabase.from("menus").update(payload).eq("id", menuId!);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Alimentação atualizada.");
      setPrepDraft("");
      refresh();
    }
  };

  const addPrepStep = () => {
    const next = prepDraft.trim();
    if (!next) return;
    setPrepSteps((current) => [...current, next]);
    setPrepDraft("");
  };

  const applyPrice = (price: Tables<"ingredient_prices">) => {
    setIng((current) => ({
      ...current,
      name: price.name,
      where_to_buy: price.where_to_buy ?? "",
    }));
  };

  const updateIngredient = async (
    item: DraftIngredient,
    patch: { qty_per_person?: string | null; where_to_buy?: string | null },
  ) => {
    if (isCreate) {
      setLocalIngredients((current) =>
        current.map((row) => (row.id === item.id ? { ...row, ...patch } : row)),
      );
      return;
    }
    const { error } = await supabase.from("menu_ingredients").update(patch).eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await persistMinPrice(
      ingredients.map((row) =>
        row.id === item.id
          ? {
              name: row.name,
              qty_per_person:
                patch.qty_per_person !== undefined ? patch.qty_per_person : row.qty_per_person,
            }
          : row,
      ),
    );
    refresh();
  };

  const deleteIngredient = async (ingredientId: string) => {
    if (isCreate) {
      setLocalIngredients((current) => current.filter((item) => item.id !== ingredientId));
      return;
    }
    const { error } = await supabase.from("menu_ingredients").delete().eq("id", ingredientId);
    if (error) {
      toast.error(error.message);
      return;
    }
    await persistMinPrice(ingredients.filter((item) => item.id !== ingredientId));
    refresh();
  };

  const addIngredient = async () => {
    const match = selectedPrice ?? findPriceMatch(ing.name, catalog);
    if (!match) {
      toast.error("Escolha um ingrediente da tabela de Preços.");
      setIngOpen(true);
      return;
    }
    if (!parseQuantity(ing.qty_per_person)) {
      toast.error("Informe a quantidade por pessoa.");
      return;
    }
    const qty = formatQtyPerPerson(ing.qty_per_person, match.unit);
    const whereToBuy = (ing.where_to_buy.trim() || match.where_to_buy) ?? null;
    if (isCreate) {
      setLocalIngredients((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: match.name,
          qty_per_person: qty,
          where_to_buy: whereToBuy,
          kind: "ingrediente",
          notes: null,
          sort_order: current.length + 1,
        },
      ]);
      setIng({ name: "", qty_per_person: "", where_to_buy: "" });
      setIngOpen(false);
      return;
    }
    const { error } = await supabase.from("menu_ingredients").insert({
      menu_id: menuId!,
      name: match.name,
      qty_per_person: qty,
      where_to_buy: whereToBuy,
      notes: null,
      sort_order: ingredients.length + 1,
    });
    if (error) toast.error(error.message);
    else {
      await persistMinPrice([...ingredients, { name: match.name, qty_per_person: qty }]);
      setIng({ name: "", qty_per_person: "", where_to_buy: "" });
      setIngOpen(false);
      refresh();
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (isAdmin) void saveMenu();
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-2xl font-semibold">
          {isCreate ? "Nova alimentação" : (menu?.name || "Alimentação")}
        </h1>
        {isAdmin && (
          <div className="hidden shrink-0 flex-wrap gap-2 lg:flex">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => navigate({ to: "/cardapio" })}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : isCreate ? "Criar alimentação" : "Salvar"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="font-display text-base font-semibold">Dados da alimentação</h2>
      </div>
      <div>
        <h2 className="font-display text-base font-semibold">Cálculo</h2>
      </div>

      <div className="lg:col-span-2">
        {isAdmin ? (
          <div className="grid gap-4">
            <Field label="Nome">
              <Input
                value={details.name}
                maxLength={80}
                onChange={(e) => setDetails({ ...details, name: e.target.value })}
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={details.description}
                maxLength={500}
                onChange={(e) => setDetails({ ...details, description: e.target.value })}
              />
            </Field>
            <Field label="Preço mínimo / pessoa">
              <Input readOnly value={computedMin > 0 ? BRL.format(computedMin) : "—"} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4">
            <Field label="Nome">
              <Input value={menu?.name ?? ""} readOnly />
            </Field>
            <Field label="Descrição">
              <Textarea value={menu?.description ?? ""} readOnly />
            </Field>
            <Field label="Preço mínimo / pessoa">
              <Input readOnly value={computedMin > 0 ? BRL.format(computedMin) : "—"} />
            </Field>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <Field label="Lucro desejado (%)">
          <Input
            inputMode="decimal"
            placeholder="15"
            readOnly={!isAdmin}
            value={profitPct}
            onChange={(e) => {
              const value = e.target.value;
              setProfitPct(value);
              setPriceSource("profit");
              const next = chargedFromProfit(computedMin, parsePercent(value));
              setChargedDraft(next != null ? formatMoneyDraft(next) : "");
            }}
          />
        </Field>
        <Field label="Preço cobrado / pessoa">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            readOnly={!isAdmin}
            value={
              chargedFocused
                ? chargedDraft
                : parsedCharged != null
                  ? BRL.format(parsedCharged)
                  : chargedDraft
            }
            onFocus={() => isAdmin && setChargedFocused(true)}
            onBlur={() => {
              setChargedFocused(false);
              if (parsedCharged != null) setChargedDraft(formatMoneyDraft(parsedCharged));
            }}
            onChange={(e) => {
              const value = e.target.value;
              setChargedDraft(value);
              setPriceSource("charged");
              const charged = parseMoney(value);
              if (charged != null && computedMin > 0) {
                setProfitPct(formatPercentDraft(profitFromCharged(computedMin, charged)));
              }
            }}
          />
        </Field>
        {computedMin > 0 && (
          <p className="text-sm text-muted-foreground">
            Sobre o mínimo de {BRL.format(computedMin)}
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
        <h2 className="font-display text-base font-semibold">Ingredientes</h2>
        <div className="mt-3 space-y-2">
          {shopping.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-y">
                    <th className="h-10 px-1 py-2 text-xs font-semibold uppercase tracking-wide">
                      Ingrediente
                    </th>
                    <th className="h-10 px-1 py-2 text-xs font-semibold uppercase tracking-wide">
                      Qtd. / pessoa
                    </th>
                    <th className="h-10 px-1 py-2 text-xs font-semibold uppercase tracking-wide">
                      Custo / pessoa
                    </th>
                    <th className="h-10 px-1 py-2 text-xs font-semibold uppercase tracking-wide">
                      Onde comprar
                    </th>
                    {isAdmin && <th className="h-10 w-10 px-1 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {shopping.map((item, index) => {
                    const target = ingredients[index];
                    const price = findPriceMatch(item.name, catalog);
                    const personCost = costPerPerson(item.qty_per_person, price);
                    return (
                      <tr key={target?.id ?? `${item.name}-${index}`} className="border-b last:border-b-0">
                        <td className="px-1 py-2.5 font-medium">{item.name}</td>
                        <td className="px-1 py-2.5">
                          {isAdmin && target ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                key={item.qty_per_person ?? ""}
                                className="h-8 w-20"
                                inputMode="decimal"
                                defaultValue={qtyNumberPart(item.qty_per_person)}
                                onBlur={(e) => {
                                  const next = formatQtyPerPerson(e.target.value, price?.unit);
                                  if (next === (item.qty_per_person ?? "")) return;
                                  void updateIngredient(target, { qty_per_person: next || null });
                                }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {price?.unit ?? parseQuantity(item.qty_per_person)?.unit ?? ""}
                              </span>
                            </div>
                          ) : (
                            item.qty_per_person ?? "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-1 py-2.5">
                          {personCost != null ? BRL.format(personCost) : "—"}
                        </td>
                        <td className="px-1 py-2.5">
                          {isAdmin && target ? (
                            <Input
                              key={item.where_to_buy ?? ""}
                              className="h-8"
                              defaultValue={item.where_to_buy ?? ""}
                              onBlur={(e) => {
                                const next = e.target.value.trim() || null;
                                if (next === (item.where_to_buy ?? null)) return;
                                void updateIngredient(target, { where_to_buy: next });
                              }}
                            />
                          ) : (
                            <span className="text-muted-foreground">
                              {item.where_to_buy ?? "—"}
                            </span>
                          )}
                        </td>
                        {isAdmin && target && (
                          <td className="px-1 py-2.5 text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteIngredient(target.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {isAdmin && (
            <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1.3fr)_7rem_minmax(0,1fr)_6.5rem_auto]">
              <Field label="Ingrediente">
                <div className="relative">
                  <Input
                    role="combobox"
                    aria-expanded={ingOpen}
                    aria-autocomplete="list"
                    autoComplete="off"
                    placeholder="Buscar em Preços..."
                    className="pr-8"
                    maxLength={120}
                    value={ing.name}
                    onChange={(e) => {
                      setIng({ ...ing, name: e.target.value, where_to_buy: "" });
                      setIngOpen(true);
                    }}
                    onFocus={(e) => {
                      setIngOpen(true);
                      e.target.select();
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setIngOpen(false), 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setIngOpen(false);
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (priceMatches.length === 1) {
                          applyPrice(priceMatches[0]!);
                          setIngOpen(false);
                          return;
                        }
                        void addIngredient();
                      }
                    }}
                  />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                  {ingOpen && (
                    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-[min(24rem,45vh)] overflow-y-auto overflow-x-hidden rounded-md border bg-popover py-1 shadow-md">
                      {priceMatches.map((price) => (
                        <button
                          key={price.id}
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            applyPrice(price);
                            setIngOpen(false);
                          }}
                        >
                          <span className="font-medium">{price.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {BRL.format(Number(price.price))} · {price.pack_quantity} {price.unit}
                            {price.where_to_buy ? ` · ${price.where_to_buy}` : ""}
                          </span>
                        </button>
                      ))}
                      {priceMatches.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhum item em Preços
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Qtd. / pessoa">
                <div className="flex items-center gap-1">
                  <Input
                    inputMode="decimal"
                    placeholder="0,5"
                    value={ing.qty_per_person}
                    onChange={(e) => setIng({ ...ing, qty_per_person: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addIngredient();
                      }
                    }}
                  />
                  {selectedPrice?.unit ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {selectedPrice.unit}
                    </span>
                  ) : null}
                </div>
              </Field>
              <Field label="Onde comprar">
                <Input
                  placeholder="Onde comprar"
                  value={ing.where_to_buy}
                  onChange={(e) => setIng({ ...ing, where_to_buy: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addIngredient();
                    }
                  }}
                />
              </Field>
              <Field label="Custo / pessoa">
                <div className="flex h-9 items-center px-1 text-sm text-muted-foreground">
                  {draftCost != null ? BRL.format(draftCost) : "—"}
                </div>
              </Field>
              <Button
                type="button"
                size="icon"
                className="size-9"
                onClick={() => void addIngredient()}
                aria-label="Adicionar ingrediente"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-semibold">Modo de preparo</h2>
        <div className="mt-3 space-y-2">
          {prepSteps.length > 0 && (
            <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
              {prepSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                >
                  <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                    {index + 1}.
                  </span>
                  {isAdmin ? (
                    <Input
                      className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      maxLength={400}
                      value={step}
                      onChange={(e) =>
                        setPrepSteps((current) =>
                          current.map((item, i) => (i === index ? e.target.value : item)),
                        )
                      }
                    />
                  ) : (
                    <span className="min-w-0 flex-1">{step}</span>
                  )}
                  {isAdmin && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setPrepSteps((current) => current.filter((_, i) => i !== index))
                      }
                      aria-label={`Remover passo ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Adicionar passo..."
                maxLength={400}
                value={prepDraft}
                onChange={(e) => setPrepDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPrepStep();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="size-9"
                onClick={addPrepStep}
                aria-label="Adicionar passo"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          ) : (
            prepSteps.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem instruções ainda.</p>
            )
          )}
        </div>
      </div>
      </div>
      {isAdmin && (
        <div className="flex justify-end gap-2 pt-2 lg:hidden">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => navigate({ to: "/cardapio" })}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : isCreate ? "Criar alimentação" : "Salvar"}
          </Button>
        </div>
      )}
    </form>
  );
}
