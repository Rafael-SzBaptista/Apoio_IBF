import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Vincula o usuário autenticado ao cadastro de membro feito pelo administrador
 * e define o papel dele. O primeiro usuário a entrar vira administrador.
 */
export const linkCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const email = (context.claims as { email?: string }).email?.toLowerCase() ?? "";

    const { data: existing } = await supabaseAdmin
      .from("members")
      .select("id, invited_role, active")
      .eq("user_id", userId)
      .maybeSingle();

    const { count: adminCount } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    const isFirst = (adminCount ?? 0) === 0;

    let member = existing;
    if (!member) {
      const { data: byEmail } = await supabaseAdmin
        .from("members")
        .select("id, invited_role, active")
        .ilike("email", email)
        .maybeSingle();

      if (!byEmail && !isFirst) {
        return { ok: false as const, reason: "nao_convidado" };
      }

      if (byEmail) {
        const { data: updated } = await supabaseAdmin
          .from("members")
          .update({ user_id: userId })
          .eq("id", byEmail.id)
          .select("id, invited_role, active")
          .maybeSingle();
        member = updated ?? byEmail;
      } else {
        const { data: created } = await supabaseAdmin
          .from("members")
          .insert({
            email,
            full_name: email.split("@")[0] ?? "Administrador",
            user_id: userId,
            invited_role: "admin",
          })
          .select("id, invited_role, active")
          .maybeSingle();
        member = created;
      }
    }

    if (!member?.active) return { ok: false as const, reason: "inativo" };

    const role = isFirst ? "admin" : member.invited_role;
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

    return { ok: true as const, role, memberId: member.id };
  });

/**
 * Login só com e-mail cadastrado (sem senha).
 * Cria a sessão no Supabase via magic link interno.
 */
export const loginWithEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, active, invited_role, full_name")
      .ilike("email", email)
      .maybeSingle();

    if (memberError) {
      const networked = /fetch failed|ENOTFOUND|Failed to fetch/i.test(memberError.message);
      throw new Error(
        networked
          ? "Não foi possível conectar ao Supabase. Confira SUPABASE_URL no .env (botão Connect no painel)."
          : memberError.message,
      );
    }
    if (!member) throw new Error("Este e-mail ainda não foi cadastrado por um administrador.");
    if (!member.active) throw new Error("Seu acesso está desativado. Fale com um administrador.");

    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: `${crypto.randomUUID()}Aa1!`,
      email_confirm: true,
      user_metadata: { full_name: member.full_name },
    });
    if (
      createError &&
      !/already been registered|already exists|User already registered/i.test(createError.message)
    ) {
      throw new Error(createError.message);
    }

    let { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !link?.properties?.email_otp) {
      const retry = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
      });
      link = retry.data;
      linkError = retry.error;
    }
    if (linkError) throw new Error(linkError.message);

    const token = link?.properties?.email_otp;
    if (!token) throw new Error("Não foi possível gerar o acesso. Tente de novo.");

    return { ok: true as const, email, token };
  });

/** Cria o cadastro de um membro (somente administradores). */
export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        full_name: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(30).optional().nullable(),
        invited_role: z.enum(["admin", "membro"]).default("membro"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem cadastrar membros.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("members").insert({
      email: data.email.toLowerCase(),
      full_name: data.full_name,
      phone: data.phone ?? null,
      areas: [],
      invited_role: data.invited_role,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
