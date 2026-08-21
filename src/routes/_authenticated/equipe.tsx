import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  DbBanner,
  EmptyState,
  Field,
  PageSkeleton,
  SearchField,
  SidePanel,
  TablePager,
  TableDeleteButton,
} from "@/components/apoio-ui";
import { MobileRecordCard, MobileRecordList } from "@/mobile";
import { Button } from "@/components/ui/button";
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
import { useMembers, type MemberRow } from "@/hooks/use-data";
import { usePagedList } from "@/hooks/use-paged-list";
import { useIsAdmin, useSession } from "@/hooks/use-session";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/equipe")({
  ssr: false,
  component: EquipePage,
});

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  invited_role: "membro" as "admin" | "membro",
};

async function syncAccessRole(userId: string | null, role: "admin" | "membro") {
  if (!userId) return;
  if (role === "admin") {
    await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    return;
  }
  await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
}

function EquipePage() {
  const members = useMembers();
  const isAdmin = useIsAdmin();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["members"] });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (members.data ?? [])
      .filter((member) => {
        if (!needle) return true;
        const haystack = [
          member.full_name,
          member.email,
          member.phone,
          member.invited_role === "admin" ? "administrador" : "membro",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
  }, [members.data, q]);

  const paged = usePagedList(filtered, q);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (member: MemberRow) => {
    setEditing(member);
    setForm({
      full_name: member.full_name,
      email: member.email,
      phone: member.phone ?? "",
      invited_role: member.invited_role,
    });
    setOpen(true);
  };

  const save = async () => {
    const full_name = form.full_name.trim();
    const email = form.email.trim().toLowerCase();
    if (!full_name || !email) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setSaving(true);
    const payload = {
      full_name,
      email,
      phone: form.phone.trim() || null,
      invited_role: form.invited_role,
      active: true,
    };

    const { error } = editing
      ? await supabase.from("members").update(payload).eq("id", editing.id)
      : await supabase.from("members").insert(payload);

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    if (editing) await syncAccessRole(editing.user_id, form.invited_role);

    toast.success(editing ? "Membro atualizado." : "Membro cadastrado. Já pode entrar só com o e-mail.");
    setSaving(false);
    setOpen(false);
    refresh();
  };

  return (
    <AppShell
      wide
      actions={
        isAdmin ? (
          <Button onClick={openNew}>
            <Plus className="size-4" /> Convidar
          </Button>
        ) : undefined
      }
    >
      {members.error && <DbBanner error={members.error} />}
      {members.isLoading ? (
        <PageSkeleton />
      ) : (members.data ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro cadastrado"
          description="O administrador já está cadastrado. Convide o restante da equipe pelo e-mail."
          action={
            isAdmin ? (
              <Button onClick={openNew}>
                <Plus className="size-4" /> Convidar
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <SearchField
              value={q}
              onChange={setQ}
              className="w-full min-w-0 flex-1 lg:w-60 lg:flex-none"
            />
            {isAdmin ? (
              <Button
                size="icon"
                className="size-9 shrink-0 lg:hidden"
                aria-label="Convidar"
                onClick={openNew}
              >
                <Plus className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y">
                  <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                    Nome
                  </th>
                  <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide md:table-cell">
                    E-mail
                  </th>
                  <th className="hidden h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide lg:table-cell">
                    Telefone
                  </th>
                  <th className="h-10 py-2 pr-4 text-xs font-semibold uppercase tracking-wide">
                    Função
                  </th>
                  {isAdmin && <th className="h-10 w-14 py-2" />}
                </tr>
              </thead>
              <tbody>
                {paged.total === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum resultado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  paged.pageItems.map((member) => (
                    <tr
                      key={member.id}
                      className={
                        isAdmin
                          ? "cursor-pointer border-b last:border-b-0 hover:bg-secondary/50"
                          : "border-b last:border-b-0"
                      }
                      onClick={() => isAdmin && openEdit(member)}
                    >
                      <td className="py-2.5 pr-4">
                        <p className="truncate font-medium">{member.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground md:hidden">{member.email}</p>
                      </td>
                      <td className="hidden py-2.5 pr-4 text-muted-foreground md:table-cell">
                        {member.email}
                      </td>
                      <td className="hidden py-2.5 pr-4 text-muted-foreground lg:table-cell">
                        {member.phone ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={member.invited_role === "admin" ? "default" : "secondary"}>
                          {member.invited_role === "admin" ? "Administrador" : "Membro"}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                          {!(member.user_id && member.user_id === session?.user.id) && (
                            <TableDeleteButton
                              title="Excluir este membro?"
                              description="O membro perderá o convite e precisará ser cadastrado novamente."
                              onConfirm={async () => {
                                const { error } = await supabase
                                  .from("members")
                                  .delete()
                                  .eq("id", member.id);
                                if (error) toast.error(error.message);
                                else {
                                  toast.success("Membro excluído.");
                                  refresh();
                                }
                              }}
                            />
                          )}
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
              {paged.pageItems.map((member) => (
                <MobileRecordCard
                  key={member.id}
                  topLeft={member.full_name}
                  bottomLeft={member.email}
                  topRight={
                    <Badge variant={member.invited_role === "admin" ? "default" : "secondary"}>
                      {member.invited_role === "admin" ? "Admin" : "Membro"}
                    </Badge>
                  }
                  bottomRight={member.phone ?? "—"}
                  onClick={() => openEdit(member)}
                  action={
                    isAdmin && !(member.user_id && member.user_id === session?.user.id) ? (
                      <TableDeleteButton
                        title="Excluir este membro?"
                        description="O membro perderá o convite e precisará ser cadastrado novamente."
                        onConfirm={async () => {
                          const { error } = await supabase.from("members").delete().eq("id", member.id);
                          if (error) toast.error(error.message);
                          else {
                            toast.success("Membro excluído.");
                            refresh();
                          }
                        }}
                      />
                    ) : undefined
                  }
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
        eyebrow="Detalhes do membro"
        title={editing ? "Editar membro" : "Cadastrar membro"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={save}>
              {editing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nome">
            <Input
              value={form.full_name}
              maxLength={120}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              maxLength={255}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={form.phone}
              maxLength={30}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Função de acesso">
            <Select
              value={form.invited_role}
              onValueChange={(value: "admin" | "membro") =>
                setForm({ ...form, invited_role: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SidePanel>
    </AppShell>
  );
}
