import { useState } from "react";
import type { FormEvent } from "react";
import { Boxes, Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DatePicker, TimePicker } from "@/components/date-time-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/apoio-ui";
import { ASSIGNMENT_AREA, ASSIGNMENT_AREAS, assignmentAreaLabel, DEFAULT_TASKS, EVENT_STATUS, eventStatusValue } from "@/lib/constants";
import { parseQuantity, buildShoppingList } from "@/lib/apoio-utils";
import { cn } from "@/lib/utils";
import { usePrices, type MenuWithIngredients } from "@/hooks/use-data";
import { EventValueChart } from "@/components/event-value-chart.lazy";

function foldText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type EventAssignmentDraft = {
  member_id: string;
  area: string;
  member_name: string;
};

export type EventShoppingDraft = {
  key: string;
  menu_ingredient_id: string | null;
  name: string;
  qty_per_person: string;
  where_to_buy: string;
  notes: string;
};

export type EventDecorationDraft = {
  key: string;
  title: string;
  inventory_item_id: string | null;
  notes: string;
  sector: string | null;
};

export type EventPlanningValues = {
  tasks: string[];
  assignments: EventAssignmentDraft[];
  decorations: EventDecorationDraft[];
  shopping: EventShoppingDraft[];
};

export type EventFormValues = {
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  maps_url: string;
  expected_people: string;
  menu_id: string;
  food_label: string;
  phones: string;
  notes: string;
  status: string;
  photo_enabled: boolean;
};

export const emptyEventForm = (): EventFormValues => ({
  title: "",
  event_date: "",
  event_time: "19:30",
  location: "Salão dos jovens",
  maps_url: "",
  expected_people: "",
  menu_id: "",
  food_label: "",
  phones: "",
  notes: "",
  status: "aberta",
  photo_enabled: false,
});

export const emptyEventPlanning = (): EventPlanningValues => ({
  tasks: [...DEFAULT_TASKS],
  assignments: [],
  decorations: [],
  shopping: [],
});

function shoppingFromMenu(menu?: MenuWithIngredients | null): EventShoppingDraft[] {
  return [...(menu?.menu_ingredients ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      key: item.id,
      menu_ingredient_id: item.id,
      name: item.name,
      qty_per_person: item.qty_per_person ?? "",
      where_to_buy: item.where_to_buy ?? "",
      notes: item.notes ?? "",
    }));
}

function shoppingTotalLabel(qtyPerPerson: string, people: number) {
  const parsed = parseQuantity(qtyPerPerson);
  if (!parsed) return qtyPerPerson.trim() || "—";
  const total = parsed.value * Math.max(people, 1);
  return `${Number(total.toFixed(2)).toLocaleString("pt-BR")} ${parsed.unit}`.trim();
}

export function EventForm({
  initial,
  menus,
  members = [],
  inventory = [],
  submitLabel,
  onSubmit,
  onCancel,
  title = "Nova programação",
  showStatus = false,
  showPlanning = false,
  initialPlanning,
}: {
  initial: EventFormValues;
  menus: MenuWithIngredients[];
  members?: { id: string; full_name: string; active?: boolean }[];
  inventory?: { id: string; name: string; sector: string }[];
  submitLabel: string;
  onSubmit: (values: EventFormValues, planning?: EventPlanningValues) => Promise<void>;
  onCancel?: () => void;
  title?: string;
  showStatus?: boolean;
  showPlanning?: boolean;
  initialPlanning?: EventPlanningValues;
}) {
  const [values, setValues] = useState(initial);
  const [planning, setPlanning] = useState<EventPlanningValues>(() => {
    const base = initialPlanning ?? emptyEventPlanning();
    if ((base.shopping ?? []).length > 0) return { ...base, shopping: base.shopping };
    const menu = menus.find((item) => item.id === initial.menu_id);
    return { ...base, shopping: shoppingFromMenu(menu) };
  });
  const [assignMember, setAssignMember] = useState("");
  const [assignArea, setAssignArea] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [decorationTitle, setDecorationTitle] = useState("");
  const [decorationItemId, setDecorationItemId] = useState<string | null>(null);
  const [decorOpen, setDecorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTyping, setMenuTyping] = useState(false);
  const [menuQuery, setMenuQuery] = useState(
    () => menus.find((item) => item.id === initial.menu_id)?.name ?? "",
  );
  const [shopDraft, setShopDraft] = useState({ name: "", qty_per_person: "", where_to_buy: "" });
  const [busy, setBusy] = useState(false);
  const prices = usePrices();

  const activeMembers = members.filter((member) => member.active !== false);
  const selectedMenu = menus.find((item) => item.id === values.menu_id) ?? null;
  const selectedMenuName = selectedMenu?.name ?? "";
  const menuNeedle = menuTyping ? foldText(menuQuery) : "";
  const menuMatches = menus.filter((menu) => foldText(menu.name).includes(menuNeedle));
  const showNoneOption = !menuNeedle || foldText("Sem cardápio").includes(menuNeedle);

  const applyMenu = (menuId: string) => {
    const menu = menus.find((item) => item.id === menuId);
    setValues((current) => ({
      ...current,
      menu_id: menuId,
      food_label: menu?.name ?? "",
    }));
    setPlanning((current) => ({
      ...current,
      shopping: menuId ? shoppingFromMenu(menu) : [],
    }));
    setMenuQuery(menu?.name ?? "");
    setMenuTyping(false);
    setMenuOpen(false);
  };

  const set = (key: keyof EventFormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (showPlanning) {
      if (!values.title.trim()) {
        toast.error("Informe o nome do evento.");
        return;
      }
      if (!values.location.trim()) {
        toast.error("Informe o local do evento.");
        return;
      }
      if (planning.assignments.length === 0) {
        toast.error("Escalone ao menos uma pessoa.");
        return;
      }
    }

    setBusy(true);
    try {
      await onSubmit(
        values,
        showPlanning
          ? {
              tasks: planning.tasks.map((task) => task.trim()).filter(Boolean),
              assignments: planning.assignments,
              decorations: planning.decorations
                .map((item) => ({
                  ...item,
                  title: item.title.trim(),
                  notes: item.notes.trim(),
                }))
                .filter((item) => item.title),
              shopping: planning.shopping
                .map((item) => ({
                  ...item,
                  name: item.name.trim(),
                  qty_per_person: item.qty_per_person.trim(),
                  where_to_buy: item.where_to_buy.trim(),
                  notes: item.notes.trim(),
                }))
                .filter((item) => item.name),
            }
          : undefined,
      );
    } finally {
      setBusy(false);
    }
  };

  const addAssignment = () => {
    if (!assignMember) {
      toast.error("Escolha o membro.");
      return;
    }
    if (!assignArea) {
      toast.error("Escolha a área: decoração ou alimentação.");
      return;
    }
    const member = activeMembers.find((m) => m.id === assignMember);
    if (!member) return;
    if (
      planning.assignments.some(
        (a) => a.member_id === assignMember && a.area === assignArea,
      )
    ) {
      toast.error("Essa pessoa já está nessa área.");
      return;
    }
    setPlanning((current) => ({
      ...current,
      assignments: [
        ...current.assignments,
        { member_id: assignMember, area: assignArea, member_name: member.full_name },
      ],
    }));
    setAssignMember("");
    setAssignArea("");
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      toast.success("Criado");
    }
  };

  const addTask = () => {
    const title = taskTitle.trim();
    if (!title) return;
    setPlanning((current) => ({ ...current, tasks: [...current.tasks, title] }));
    setTaskTitle("");
  };

  const addDecoration = () => {
    const selected = inventory.find((item) => item.id === decorationItemId);
    const title = (selected?.name ?? decorationTitle).trim();
    if (!title) return;
    if (
      selected &&
      planning.decorations.some((item) => item.inventory_item_id === selected.id)
    ) {
      toast.error("Esse item do almoxarifado já está na lista.");
      return;
    }
    setPlanning((current) => ({
      ...current,
      decorations: [
        ...current.decorations,
        {
          key: crypto.randomUUID(),
          title,
          inventory_item_id: selected?.id ?? null,
          notes: "",
          sector: selected?.sector ?? null,
        },
      ],
    }));
    setDecorationTitle("");
    setDecorationItemId(null);
    setDecorOpen(false);
  };

  const inventoryMatches = inventory
    .filter((item) => !planning.decorations.some((row) => row.inventory_item_id === item.id))
    .filter((item) => {
      const needle = decorationTitle.trim().toLowerCase();
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) || item.sector.toLowerCase().includes(needle)
      );
    })
    .slice(0, 8);

  const addShoppingItem = () => {
    const name = shopDraft.name.trim();
    if (!name) return;
    setPlanning((current) => ({
      ...current,
      shopping: [
        ...current.shopping,
        {
          key: crypto.randomUUID(),
          menu_ingredient_id: null,
          name,
          qty_per_person: shopDraft.qty_per_person.trim(),
          where_to_buy: shopDraft.where_to_buy.trim(),
          notes: "",
        },
      ],
    }));
    setShopDraft({ name: "", qty_per_person: "", where_to_buy: "" });
  };

  const updateShopping = (index: number, patch: Partial<EventShoppingDraft>) => {
    setPlanning((current) => ({
      ...current,
      shopping: current.shopping.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const peopleCount = Number(values.expected_people) || 0;
  const chargedPerPerson =
    selectedMenu?.charged_price_per_person != null
      ? Number(selectedMenu.charged_price_per_person)
      : null;
  const shoppingCost =
    peopleCount > 0
      ? buildShoppingList(
          planning.shopping.map((item) => ({
            name: item.name,
            qty_per_person: item.qty_per_person || null,
            kind: "ingrediente",
            where_to_buy: item.where_to_buy || null,
            notes: item.notes || null,
          })),
          peopleCount,
          prices.data ?? [],
        ).reduce((sum, item) => sum + (item.estimate?.cost ?? 0), 0)
      : 0;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
        </div>
        <div className="hidden shrink-0 flex-wrap gap-2 lg:flex">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : submitLabel}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Detalhes do evento</h2>
        </div>
        {showPlanning && (
          <div>
            <h2 className="font-display text-base font-semibold">Escala</h2>
          </div>
        )}

        <div className={showPlanning ? "lg:col-span-2" : "lg:col-span-3"}>
          <Field label="Nome do evento" required>
            <Input
              required
              maxLength={120}
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Culto Conecte"
            />
          </Field>
        </div>
        {showPlanning && (
          <div className="grid grid-cols-[minmax(0,1fr)_9.5rem_auto] items-center gap-x-2 gap-y-2">
            <Label>
              Membro<span className="text-primary"> *</span>
            </Label>
            <Label>
              Área<span className="text-primary"> *</span>
            </Label>
            <span aria-hidden />
            <Select value={assignMember || undefined} onValueChange={setAssignMember}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Membro" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignArea || undefined} onValueChange={setAssignArea}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_AREAS.map((area) => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="icon"
              className="size-9"
              onClick={addAssignment}
              aria-label="Escalar"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        )}

        <div className={cn("grid gap-4", showPlanning ? "lg:col-span-2" : "lg:col-span-3")}>
        <div>
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Data" required className="sm:col-span-2">
              <DatePicker
                required
                value={values.event_date}
                onChange={(value) => set("event_date", value)}
              />
            </Field>
            <Field label="Horário" className="sm:col-span-1">
              <TimePicker
                value={values.event_time}
                onChange={(value) => set("event_time", value)}
              />
            </Field>
            <Field label="Link do Maps" className="sm:col-span-2">
              <Input
                type="url"
                maxLength={500}
                value={values.maps_url}
                onChange={(e) => set("maps_url", e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </Field>
            <Field label="Foto" className="sm:col-span-1">
              <Select
                value={values.photo_enabled ? "sim" : "nao"}
                onValueChange={(value) =>
                  setValues((current) => ({ ...current, photo_enabled: value === "sim" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Local" required={showPlanning} className="sm:col-span-2">
              <Input
                required={showPlanning}
                maxLength={160}
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </Field>
            <Field label="Pessoas esperadas" className="sm:col-span-1">
              <Input
                type="number"
                min={0}
                value={values.expected_people}
                onChange={(e) => set("expected_people", e.target.value)}
              />
            </Field>
            <Field label="Cardápio" className="sm:col-span-3">
              <div className="relative">
                <Input
                  role="combobox"
                  aria-expanded={menuOpen}
                  aria-autocomplete="list"
                  autoComplete="off"
                  placeholder="Escolher alimentação"
                  className="pr-8"
                  value={menuTyping ? menuQuery : selectedMenuName}
                  onChange={(e) => {
                    setMenuQuery(e.target.value);
                    setMenuTyping(true);
                    setMenuOpen(true);
                  }}
                  onFocus={(e) => {
                    setMenuOpen(true);
                    e.target.select();
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setMenuOpen(false);
                      setMenuTyping(false);
                    }, 150);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setMenuOpen(false);
                      setMenuTyping(false);
                      setMenuQuery(selectedMenuName);
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (menuMatches.length === 1) {
                        applyMenu(menuMatches[0].id);
                      } else if (!menuQuery.trim() && showNoneOption) {
                        applyMenu("");
                      }
                    }
                  }}
                />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                {menuOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(24rem,45vh)] overflow-y-auto overflow-x-hidden rounded-md border bg-popover py-1 shadow-md">
                    {showNoneOption && (
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-secondary",
                          !values.menu_id && "bg-secondary",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMenu("")}
                      >
                        Sem cardápio
                        {!values.menu_id && <Check className="size-4" />}
                      </button>
                    )}
                    {menuMatches.map((menu) => (
                      <button
                        key={menu.id}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-secondary",
                          values.menu_id === menu.id && "bg-secondary",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMenu(menu.id)}
                      >
                        {menu.name}
                        {values.menu_id === menu.id && <Check className="size-4" />}
                      </button>
                    ))}
                    {menuMatches.length === 0 && !showNoneOption && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Nenhum cardápio encontrado
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Field>
            {showStatus && (
              <Field label="Status" className="sm:col-span-6">
                <Select value={values.status} onValueChange={(value) => set("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div
              className={cn(
                "grid gap-4",
                showPlanning ? "sm:col-span-6 sm:grid-cols-2 sm:items-start" : "sm:col-span-6",
              )}
            >
              <div className="grid gap-4">
                <Field label="Telefones de contato">
                  <Input
                    maxLength={120}
                    value={values.phones}
                    onChange={(e) => set("phones", e.target.value)}
                    placeholder="(11) 90000-0000"
                  />
                </Field>
                <Field label="Observações">
                  <Textarea
                    rows={showPlanning ? 6 : 5}
                    maxLength={2000}
                    value={values.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </Field>
              </div>
              {showPlanning && (
                <div>
                  <h2 className="font-display text-base font-semibold">Custo da programação</h2>
                  <div className="mt-1">
                    <EventValueChart
                      size="md"
                      metric="custo"
                      people={peopleCount}
                      chargedPerPerson={chargedPerPerson}
                      cost={shoppingCost}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {showPlanning && (
          <div className="grid gap-6">
            {planning.assignments.length > 0 && (
              <div className="max-h-[17rem] space-y-2 overflow-y-auto pr-1">
                {planning.assignments.map((assignment, index) => (
                  <div
                    key={`${assignment.member_id}-${index}`}
                    className="flex items-center gap-3 rounded-md bg-muted px-3 py-2"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold">
                      {initials(assignment.member_name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {assignment.member_name}
                    </span>
                    <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {assignmentAreaLabel(assignment.area)}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setPlanning((current) => ({
                          ...current,
                          assignments: current.assignments.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <h2 className="font-display text-base font-semibold">Tarefas</h2>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Adicionar tarefa..."
                    maxLength={160}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="size-9"
                    onClick={addTask}
                    aria-label="Adicionar tarefa"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="max-h-[17rem] space-y-2 overflow-y-auto pr-1">
                {planning.tasks.map((task, index) => (
                  <div
                    key={`${task}-${index}`}
                    className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm"
                  >
                    <span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" />
                    <span className="min-w-0 flex-1">{task}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setPlanning((current) => ({
                          ...current,
                          tasks: current.tasks.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {showPlanning && (
          <div className="lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Compras</h2>
          <div className="mt-1 hidden h-5 lg:block" aria-hidden />
          <div className="mt-3 space-y-2">
            {planning.shopping.length > 0 && (
              <div className="grid gap-2">
                <div className="hidden gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_7rem_6rem_1fr_auto]">
                  <span className="px-1">Item</span>
                  <span className="px-1">Qtd. / pessoa</span>
                  <span className="px-1">Total</span>
                  <span className="px-1">Onde</span>
                  <span className="w-7" />
                </div>
                <div className="grid max-h-[26.5rem] gap-2 overflow-y-auto pr-1">
                {planning.shopping.map((item, index) => (
                  <div
                    key={item.key}
                    className="grid items-center gap-2 sm:grid-cols-[1fr_7rem_6rem_1fr_auto]"
                  >
                    <Input
                      className="h-7"
                      value={item.name}
                      maxLength={120}
                      onChange={(e) => updateShopping(index, { name: e.target.value })}
                    />
                    <Input
                      className="h-7"
                      value={item.qty_per_person}
                      maxLength={40}
                      placeholder="40g"
                      onChange={(e) =>
                        updateShopping(index, { qty_per_person: e.target.value })
                      }
                    />
                    <span className="hidden px-1 text-sm text-muted-foreground sm:block">
                      {shoppingTotalLabel(item.qty_per_person, peopleCount)}
                    </span>
                    <Input
                      className="h-7"
                      value={item.where_to_buy}
                      maxLength={120}
                      placeholder="—"
                      onChange={(e) =>
                        updateShopping(index, { where_to_buy: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() =>
                        setPlanning((current) => ({
                          ...current,
                          shopping: current.shopping.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                </div>
              </div>
            )}
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_7rem_1fr_auto]">
              <Input
                placeholder="Adicionar item..."
                maxLength={120}
                value={shopDraft.name}
                onChange={(e) => setShopDraft((current) => ({ ...current, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addShoppingItem();
                  }
                }}
              />
              <Input
                placeholder="Qtd."
                maxLength={40}
                value={shopDraft.qty_per_person}
                onChange={(e) =>
                  setShopDraft((current) => ({ ...current, qty_per_person: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addShoppingItem();
                  }
                }}
              />
              <Input
                placeholder="Onde comprar"
                maxLength={120}
                value={shopDraft.where_to_buy}
                onChange={(e) =>
                  setShopDraft((current) => ({ ...current, where_to_buy: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addShoppingItem();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="size-9"
                onClick={addShoppingItem}
                aria-label="Adicionar item"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          </div>
        )}

        {showPlanning && (
          <div className="lg:col-start-3">
              <h2 className="font-display text-base font-semibold">Possível decoração</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Busque no almoxarifado ou registre uma ideia livre.
              </p>
              <div className="mt-3 space-y-2">
              <div className="relative flex gap-2">
                    <Input
                      placeholder="Buscar no almoxarifado ou nova ideia..."
                      maxLength={160}
                      value={decorationTitle}
                      onChange={(e) => {
                        setDecorationTitle(e.target.value);
                        setDecorationItemId(null);
                        setDecorOpen(true);
                      }}
                      onFocus={() => setDecorOpen(true)}
                      onBlur={() => {
                        window.setTimeout(() => setDecorOpen(false), 150);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDecoration();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="size-9"
                      onClick={addDecoration}
                      aria-label="Adicionar decoração"
                    >
                      <Plus className="size-4" />
                    </Button>
                    {decorOpen && inventoryMatches.length > 0 && (
                      <div className="absolute bottom-full left-0 right-10 z-50 mb-1 max-h-[min(24rem,45vh)] overflow-y-auto overflow-x-hidden rounded-md border bg-popover shadow-md">
                        {inventoryMatches.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDecorationTitle(item.name);
                              setDecorationItemId(item.id);
                              setDecorOpen(false);
                            }}
                          >
                            <span className="font-medium">{item.name}</span>
                            <span className="text-[11px] text-muted-foreground">{item.sector}</span>
                          </button>
                        ))}
                      </div>
                    )}
              </div>
                <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                {planning.decorations.map((item, index) => (
                  <div
                    key={item.key}
                    className="rounded-md bg-muted px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.inventory_item_id && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Boxes className="size-3" />
                            Almoxarifado
                            {(() => {
                              const sector =
                                item.sector ??
                                inventory.find((row) => row.id === item.inventory_item_id)?.sector;
                              return sector ? ` · ${sector}` : "";
                            })()}
                          </p>
                        )}
                        <Input
                          className="mt-1.5 h-7"
                          placeholder="Como usar (opcional)"
                          maxLength={200}
                          value={item.notes}
                          onChange={(e) =>
                            setPlanning((current) => ({
                              ...current,
                              decorations: current.decorations.map((row, i) =>
                                i === index ? { ...row, notes: e.target.value } : row,
                              ),
                            }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        onClick={() =>
                          setPlanning((current) => ({
                            ...current,
                            decorations: current.decorations.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              </div>
          </div>
        )}
      </div>
        <div className="flex justify-end gap-2 pt-2 lg:hidden">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Salvando..." : submitLabel}
          </Button>
        </div>
    </form>
  );
}

export function toEventPayload(values: EventFormValues) {
  return {
    title: values.title.trim(),
    event_date: values.event_date,
    event_time: values.event_time || null,
    location: values.location.trim() || null,
    maps_url: values.maps_url.trim() || null,
    expected_people: values.expected_people ? Number(values.expected_people) : null,
    menu_id: values.menu_id || null,
    food_label: values.food_label.trim() || null,
    phones: values.phones.trim() || null,
    notes: values.notes.trim() || null,
    status: values.status,
    photo_enabled: values.photo_enabled,
  };
}

export function eventToFormValues(event: {
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  maps_url: string | null;
  expected_people: number | null;
  menu_id: string | null;
  food_label: string | null;
  phones: string | null;
  notes: string | null;
  status: string;
  photo_enabled?: boolean;
}): EventFormValues {
  return {
    title: event.title,
    event_date: event.event_date,
    event_time: event.event_time?.slice(0, 5) ?? "",
    location: event.location ?? "",
    maps_url: event.maps_url ?? "",
    expected_people: event.expected_people != null ? String(event.expected_people) : "",
    menu_id: event.menu_id ?? "",
    food_label: event.food_label ?? "",
    phones: event.phones ?? "",
    notes: event.notes ?? "",
    status: eventStatusValue(event.status),
    photo_enabled: !!event.photo_enabled,
  };
}

export function eventToPlanning(event: {
  event_assignments?: {
    member_id: string;
    area: string;
    members?: { full_name: string } | null;
  }[] | null;
  event_tasks?: { title: string; sort_order: number }[] | null;
  event_decorations?: {
    id?: string;
    title: string;
    sort_order: number;
    notes?: string | null;
    inventory_item_id?: string | null;
  }[] | null;
  event_shopping_items?: {
    id: string;
    menu_ingredient_id: string | null;
    name: string;
    qty_per_person: string | null;
    where_to_buy: string | null;
    notes: string | null;
    sort_order: number;
  }[] | null;
}): EventPlanningValues {
  return {
    tasks: [...(event.event_tasks ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((task) => task.title),
    assignments: (event.event_assignments ?? []).map((assignment) => ({
      member_id: assignment.member_id,
      area: assignment.area || ASSIGNMENT_AREA,
      member_name: assignment.members?.full_name ?? "",
    })),
    decorations: [...(event.event_decorations ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        key: item.id ?? crypto.randomUUID(),
        title: item.title,
        inventory_item_id: item.inventory_item_id ?? null,
        notes: item.notes ?? "",
        sector: null,
      })),
    shopping: [...(event.event_shopping_items ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((item) => item.name)
      .map((item) => ({
        key: item.id,
        menu_ingredient_id: item.menu_ingredient_id,
        name: item.name,
        qty_per_person: item.qty_per_person ?? "",
        where_to_buy: item.where_to_buy ?? "",
        notes: item.notes ?? "",
      })),
  };
}
