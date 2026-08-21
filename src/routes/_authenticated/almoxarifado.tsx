import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Plus } from "lucide-react";
import { FileField, StoredFileButton } from "@/components/file-field";
import { AppShell } from "@/components/app-shell";
import { DbBanner, EmptyState, Field, PageSkeleton, SearchField, SidePanel, TablePager, TableDeleteButton } from "@/components/apoio-ui";
import { MobileRecordCard, MobileRecordList } from "@/mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { removePrivateFile, uploadPrivateFile } from "@/lib/storage";
import { useInventory, useInventorySectors, type InventoryRow } from "@/hooks/use-data";
import { usePagedList } from "@/hooks/use-paged-list";
import { useIsAdmin, useSession } from "@/hooks/use-session";
import { SECTORS } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/almoxarifado")({
  ssr: false,
  component: AlmoxarifadoPage,
});

const emptyItem = (defaultSector: string) => ({
  name: "",
  sector: defaultSector,
  quantity: "",
  unit: "un",
  location: "",
  notes: "",
});

function AlmoxarifadoPage() {
  const inventory = useInventory();
  const sectorsQuery = useInventorySectors();
  const isAdmin = useIsAdmin();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("todos");
  const [open, setOpen] = useState(false);
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorName, setSectorName] = useState("");
  const [editing, setEditing] = useState<InventoryRow | null>(null);
  const [form, setForm] = useState(emptyItem(SECTORS[0]));
  const [photo, setPhoto] = useState<File | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(true);

  const sectors = useMemo(() => {
    const names = new Set<string>(SECTORS);
    for (const row of sectorsQuery.data ?? []) names.add(row.name);
    for (const item of inventory.data ?? []) names.add(item.sector);
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [sectorsQuery.data, inventory.data]);

  const defaultSector = sectors[0] ?? SECTORS[0];

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (inventory.data ?? [])
      .filter((item) => {
        const matchesSector = sector === "todos" || item.sector === sector;
        if (!matchesSector) return false;
        if (!needle) return true;
        const haystack = [item.name, item.sector, item.location, item.notes, item.quantity_note]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort(
        (a, b) => a.sector.localeCompare(b.sector, "pt-BR") || a.name.localeCompare(b.name, "pt-BR"),
      );
  }, [inventory.data, q, sector]);

  const paged = usePagedList(items, `${q}|${sector}`);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-sectors"] });
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyItem(defaultSector));
    setPhoto(null);
    setKeepPhoto(true);
    setOpen(true);
  };

  const openEdit = (item: InventoryRow) => {
    setEditing(item);
    setForm({
      name: item.name,
      sector: item.sector,
      quantity: item.quantity != null ? String(item.quantity) : "",
      unit: item.unit ?? "un",
      location: item.location ?? "",
      notes: item.notes ?? "",
    });
    setPhoto(null);
    setKeepPhoto(true);
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      sector: form.sector,
      quantity: form.quantity ? Number(form.quantity) : null,
      unit: form.unit || null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (!payload.name) return;

    const previousImage = editing?.image_url ?? null;
    let image_url = keepPhoto ? previousImage : null;
    if (photo) {
      try {
        image_url = await uploadPrivateFile("inventario", photo);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
        return;
      }
    }

    if (editing) {
      const prevQty = Number(editing.quantity ?? 0);
      const nextQty = Number(payload.quantity ?? 0);
      const { error } = await supabase
        .from("inventory_items")
        .update({ ...payload, image_url, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (nextQty !== prevQty) {
        await supabase.from("inventory_movements").insert({
          item_id: editing.id,
          delta: nextQty - prevQty,
          reason: "ajuste",
          created_by: session?.user.id ?? null,
        });
      }
    } else {
      const { error } = await supabase.from("inventory_items").insert({ ...payload, image_url });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    if (previousImage && previousImage !== image_url) {
      await removePrivateFile("inventario", previousImage);
    }
    toast.success("Item salvo.");
    setOpen(false);
    refresh();
  };

  const createSector = async () => {
    const name = sectorName.trim();
    if (!name) {
      toast.error("Informe o nome do setor.");
      return;
    }
    if (sectors.some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast.error("Este setor já existe.");
      return;
    }
    const sort_order = (sectorsQuery.data ?? []).length + 1;
    const { error } = await supabase.from("inventory_sectors").insert({ name, sort_order });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Setor criado.");
    setSectorName("");
    setSectorOpen(false);
    refresh();
  };

  return (
    <AppShell
      wide
      actions={
        isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSectorOpen(true)}>
              <Plus className="size-4" /> Novo setor
            </Button>
            <Button onClick={openNew}>
              <Plus className="size-4" /> Novo item
            </Button>
          </div>
        ) : undefined
      }
    >
      {inventory.error && <DbBanner error={inventory.error} />}
      {sectorsQuery.error && <DbBanner error={sectorsQuery.error} />}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <SearchField
            value={q}
            onChange={setQ}
            className="w-full min-w-0 flex-1 lg:w-60 lg:flex-none"
          />
          {isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="size-9 shrink-0 lg:hidden" aria-label="Criar">
                  <Plus className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSectorOpen(true)}>
                  <Plus className="size-4" /> Novo setor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openNew}>
                  <Plus className="size-4" /> Novo item
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <Select value={sector} onValueChange={setSector}>
          <SelectTrigger className="w-full min-w-0 sm:w-auto sm:min-w-40">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {sectors.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {inventory.isLoading ? (
        <PageSkeleton />
      ) : (inventory.data ?? []).length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhum item encontrado"
          description="Cadastre o que está no depósito: papelaria, iluminação, vasos, esportes, fantasias..."
          action={
            isAdmin ? (
              <Button onClick={openNew}>
                <Plus className="size-4" /> Cadastrar item
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-y">
                <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                  Item
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide md:table-cell">
                  Setor
                </th>
                <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                  Quantidade
                </th>
                <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                  Unidade
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide lg:table-cell">
                  Local
                </th>
                <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide xl:table-cell">
                  Observação
                </th>
                {isAdmin && <th className="h-10 w-20 py-2" />}
              </tr>
            </thead>
            <tbody>
              {paged.total === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum resultado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paged.pageItems.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      isAdmin
                        ? "cursor-pointer border-b last:border-b-0 hover:bg-secondary/50"
                        : "border-b last:border-b-0"
                    }
                    onClick={() => isAdmin && openEdit(item)}
                  >
                    <td className="py-2.5 pr-4">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground md:hidden">{item.sector}</p>
                    </td>
                    <td className="hidden py-2.5 pr-4 text-muted-foreground md:table-cell">
                      {item.sector}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4">
                      {item.quantity != null ? item.quantity : (item.quantity_note ?? "—")}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-muted-foreground">
                      {item.unit ?? "—"}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-muted-foreground lg:table-cell">
                      {item.location ?? "—"}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-muted-foreground xl:table-cell">
                      {item.notes ?? "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {item.image_url ? (
                            <StoredFileButton bucket="inventario" path={item.image_url} label="Ver foto" />
                          ) : null}
                          <TableDeleteButton
                            title="Excluir este item?"
                            description="O item será removido do almoxarifado."
                            onConfirm={async () => {
                              const { error } = await supabase
                                .from("inventory_items")
                                .delete()
                                .eq("id", item.id);
                              if (error) toast.error(error.message);
                              else {
                                if (item.image_url) await removePrivateFile("inventario", item.image_url);
                                toast.success("Item excluído.");
                                refresh();
                              }
                            }}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paged.total === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground lg:hidden">
            Nenhum resultado com os filtros atuais.
          </p>
        )}
        {paged.total > 0 && (
          <MobileRecordList>
            {paged.pageItems.map((item) => (
              <MobileRecordCard
                key={item.id}
                topLeft={item.name}
                bottomLeft={item.sector}
                topRight={
                  <span className="font-medium text-foreground">
                    {item.quantity != null ? item.quantity : (item.quantity_note ?? "—")}
                    {item.unit ? ` ${item.unit}` : ""}
                  </span>
                }
                bottomRight={item.location ?? "—"}
                onClick={() => openEdit(item)}
              />
            ))}
          </MobileRecordList>
        )}
        <TablePager page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
        </>
      )}

      <SidePanel
        open={open}
        onOpenChange={setOpen}
        eyebrow="Detalhes do item"
        title={editing ? "Editar item" : "Novo item"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar alterações</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nome">
            <Input
              value={form.name}
              maxLength={120}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Setor">
            <Select
              value={form.sector}
              onValueChange={(value) => setForm({ ...form, sector: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade">
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label="Unidade">
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Local de guarda">
            <Input
              value={form.location}
              maxLength={120}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field label="Observação">
            <Textarea
              value={form.notes}
              maxLength={500}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <FileField
            label="Foto"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            file={photo}
            onFileChange={setPhoto}
            storedPath={keepPhoto ? editing?.image_url : null}
            storedBucket="inventario"
            onClearStored={() => setKeepPhoto(false)}
          />
        </div>
      </SidePanel>

      <SidePanel
        open={sectorOpen}
        onOpenChange={setSectorOpen}
        eyebrow="Almoxarifado"
        title="Novo setor"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setSectorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createSector}>Salvar alterações</Button>
          </>
        }
      >
        <Field label="Nome do setor">
          <Input
            value={sectorName}
            maxLength={80}
            placeholder="Ex.: Cozinha, Ferramentas..."
            onChange={(e) => setSectorName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createSector();
              }
            }}
          />
        </Field>
      </SidePanel>
    </AppShell>
  );
}
