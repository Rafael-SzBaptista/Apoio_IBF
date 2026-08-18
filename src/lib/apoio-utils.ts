export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("pt-BR", { weekday: "long" });
}

export function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Extrai o primeiro número e a unidade de textos como "40g", "1,5 und", "1/2 xícara". */
export function parseQuantity(text: string | null | undefined) {
  if (!text) return null;
  const trimmed = text.trim();
  const fraction = trimmed.match(
    /^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*([a-zA-ZçÇãÃéÉ]*)/,
  );
  if (fraction) {
    const numerator = Number(fraction[1]!.replace(",", "."));
    const denominator = Number(fraction[2]!.replace(",", "."));
    if (!Number.isNaN(numerator) && denominator) {
      return { value: numerator / denominator, unit: (fraction[3] ?? "").toLowerCase() };
    }
  }
  const match = trimmed.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-ZçÇãÃéÉ]*)/);
  if (!match) return null;
  const value = Number(match[1]!.replace(",", "."));
  if (Number.isNaN(value)) return null;
  return { value, unit: (match[2] ?? "").toLowerCase() };
}

export function qtyNumberPart(text: string | null | undefined) {
  const parsed = parseQuantity(text);
  if (!parsed) return "";
  return String(parsed.value).replace(".", ",");
}

export function formatQtyPerPerson(value: string, unit?: string | null) {
  const parsed = parseQuantity(value);
  if (!parsed) return value.trim();
  const numberPart = value.trim().replace(/[a-zA-ZçÇãÃéÉ].*$/, "").trim() || qtyNumberPart(value);
  const unitPart = (parsed.unit || unit || "").trim();
  return unitPart ? `${numberPart} ${unitPart}` : numberPart;
}

export type PriceRow = {
  name: string;
  pack_quantity: number;
  unit: string;
  price: number;
  where_to_buy?: string | null;
};

export function findPriceMatch(name: string, prices: PriceRow[]) {
  const key = foldText(name);
  if (!key) return null;
  return (
    prices.find((price) => foldText(price.name) === key) ??
    prices.find(
      (price) => key.includes(foldText(price.name)) || foldText(price.name).includes(key),
    ) ??
    null
  );
}

/** Custo do ingrediente para uma pessoa: (qtd / embalagem) × preço do pacote. */
export function costPerPerson(
  qtyPerPerson: string | null | undefined,
  price: PriceRow | null | undefined,
) {
  if (!price || !price.pack_quantity) return null;
  const parsed = parseQuantity(qtyPerPerson);
  if (!parsed) return null;
  return (parsed.value / price.pack_quantity) * Number(price.price);
}

export function minPricePerPerson(
  ingredients: { name: string; qty_per_person: string | null }[],
  prices: PriceRow[],
) {
  const total = ingredients.reduce((sum, item) => {
    const price = findPriceMatch(item.name, prices);
    return sum + (costPerPerson(item.qty_per_person, price) ?? 0);
  }, 0);
  return Math.round(total * 100) / 100;
}

/** Estima o custo total de um ingrediente para a quantidade informada. */
export function estimateCost(name: string, total: number, prices: PriceRow[]) {
  const match = findPriceMatch(name, prices);
  if (!match || !match.pack_quantity) return null;
  const packs = total / match.pack_quantity;
  return { cost: packs * match.price, packs, source: match };
}

export type IngredientRow = {
  id?: string;
  name: string;
  qty_per_person: string | null;
  kind: string;
  where_to_buy: string | null;
  notes: string | null;
};

export function buildShoppingList(
  ingredients: IngredientRow[],
  people: number,
  prices: PriceRow[],
) {
  return ingredients.map((item) => {
    const parsed = parseQuantity(item.qty_per_person);
    const total = parsed ? parsed.value * people : null;
    const totalLabel =
      parsed != null
        ? `${Number((parsed.value * people).toFixed(2)).toLocaleString("pt-BR")} ${parsed.unit}`.trim()
        : (item.qty_per_person ?? "—");
    const estimate = total != null ? estimateCost(item.name, total, prices) : null;
    return { ...item, total, totalLabel, estimate };
  });
}

export function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dbErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Não foi possível carregar os dados.";
}

export function isMissingRelation(error: unknown) {
  const message = dbErrorMessage(error);
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return /schema cache|does not exist|42P01|PGRST205|relation .* not found/i.test(
    `${message} ${code}`,
  );
}
