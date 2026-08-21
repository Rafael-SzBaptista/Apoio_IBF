import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, ClipboardList, Mail, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { linkCurrentUser, loginWithEmail } from "@/lib/apoio.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Ministério Apoio" },
      {
        name: "description",
        content:
          "Acesse o painel do ministério Apoio para organizar programações, cardápio e almoxarifado.",
      },
      { property: "og:title", content: "Entrar — Ministério Apoio" },
      {
        property: "og:description",
        content:
          "Acesse o painel do ministério Apoio para organizar programações, cardápio e almoxarifado.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});

const PILLARS = [
  { icon: ClipboardList, title: "Escalas" },
  { icon: UtensilsCrossed, title: "Cardápio" },
  { icon: Boxes, title: "Estoque" },
] as const;

function AuthPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [busy, setBusy] = useState(false);
  const linking = useRef(false);
  const navigate = useNavigate();

  const afterAuth = async () => {
    if (linking.current) return;
    linking.current = true;
    try {
      const result = await linkCurrentUser();
      if (!result.ok) {
        await supabase.auth.signOut();
        toast.error(
          result.reason === "inativo"
            ? "Seu acesso está desativado. Fale com um administrador."
            : "Este e-mail ainda não foi cadastrado por um administrador.",
        );
        linking.current = false;
        return;
      }
    } catch {
      const { data: userData } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("members")
        .select("id, active")
        .eq("user_id", userData.user?.id ?? "")
        .maybeSingle();
      if (!member?.active) {
        await supabase.auth.signOut();
        toast.error("Este e-mail ainda não foi cadastrado por um administrador.");
        linking.current = false;
        return;
      }
    }
    navigate({ to: "/inicio" });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void afterAuth();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void afterAuth();
    });
    return () => data.subscription.unsubscribe();
    // afterAuth is stable enough for this page mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishWithToken = async (address: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: address,
      token,
      type: "email",
    });
    if (error) throw error;
    await afterAuth();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "E-mail inválido");
      return;
    }
    const address = parsed.data.email.toLowerCase();
    setBusy(true);
    try {
      const result = await loginWithEmail({ data: { email: address } });
      await finishWithToken(result.email, result.token);
    } catch (err) {
      const firstMessage = err instanceof Error ? err.message : "Não foi possível entrar";
      const { data: invited, error: invitedError } = await supabase.rpc("is_invited_email", {
        _email: address,
      });
      if (invitedError) {
        toast.error(firstMessage);
        return;
      }
      if (!invited) {
        toast.error("Este e-mail ainda não foi cadastrado por um administrador.");
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
        return;
      }
      setEmail(address);
      setAwaitingOtp(true);
      toast.success("Enviamos um código para o seu e-mail.");
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setBusy(true);
    try {
      await finishWithToken(email, otp);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
      linking.current = false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-svh overflow-hidden bg-background pt-[var(--safe-top)] pb-[var(--safe-bottom)] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:pt-0 lg:pb-0">
      <BrandPanel />

      <section className="relative flex min-h-svh flex-col justify-center px-4 py-10 sm:px-8 lg:px-12 xl:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 lg:hidden"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 70%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <AppLogo
              alt="Ministério Apoio"
              width={96}
              height={116}
              fetchPriority="high"
              className="h-20 w-auto drop-shadow-sm"
            />
            <p className="mt-4 font-display text-2xl font-bold tracking-tight">Ministério Apoio</p>
            <p className="mt-1 text-sm text-muted-foreground">Jovens da Igreja Batista Fonte</p>
          </div>

          <div className="rounded-2xl border bg-card/90 p-6 shadow-lg backdrop-blur-sm sm:p-8">
            <div className="mb-6 hidden lg:block">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Acesso da equipe</p>
              <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
                {awaitingOtp ? "Confirme o código" : "Bem-vindo de volta"}
              </h1>
              {awaitingOtp ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Enviamos um código de 6 dígitos para {email}.
                </p>
              ) : null}
            </div>

            <div className="mb-6 lg:hidden">
              <h1 className="font-display text-xl font-semibold tracking-tight">
                {awaitingOtp ? "Confirme o código" : "Entrar no painel"}
              </h1>
              {awaitingOtp ? (
                <p className="mt-1.5 text-sm text-muted-foreground">Código enviado para {email}.</p>
              ) : null}
            </div>

            {awaitingOtp ? (
              <form onSubmit={confirmOtp} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="otp">Código de 6 dígitos</Label>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp} containerClassName="justify-center sm:justify-start">
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="size-11 text-base first:rounded-l-lg" />
                      <InputOTPSlot index={1} className="size-11 text-base" />
                      <InputOTPSlot index={2} className="size-11 text-base" />
                      <InputOTPSlot index={3} className="size-11 text-base" />
                      <InputOTPSlot index={4} className="size-11 text-base" />
                      <InputOTPSlot index={5} className="size-11 text-base last:rounded-r-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={busy}>
                  {busy ? "Aguarde..." : "Confirmar e entrar"}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => {
                    setAwaitingOtp(false);
                    setOtp("");
                  }}
                >
                  Usar outro e-mail
                </button>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail da equipe</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="emma.t@example.net"
                      value={email}
                      maxLength={255}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={busy}>
                  {busy ? "Aguarde..." : "Entrar"}
                </Button>
              </form>
            )}
          </div>

          <ul className="mt-8 grid grid-cols-3 gap-2 lg:hidden">
            {PILLARS.map((pillar) => (
              <li
                key={pillar.title}
                className="rounded-xl border bg-card/70 px-2 py-3 text-center shadow-sm"
              >
                <pillar.icon className="mx-auto size-4 text-primary" />
                <p className="mt-1.5 text-[11px] font-semibold">{pillar.title}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:px-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 12% 18%, color-mix(in oklch, var(--sidebar-primary) 38%, transparent), transparent 62%)",
            "radial-gradient(ellipse 50% 40% at 88% 82%, color-mix(in oklch, var(--chart-3) 22%, transparent), transparent 70%)",
          ].join(","),
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "2.75rem 2.75rem",
        }}
      />

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-sidebar-primary">
          Igreja Batista Fonte
        </p>
        <h2 className="mt-3 max-w-sm font-display text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
          Ministério Apoio
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-sidebar-foreground/75">
          Organiza alimentação, decoração e equipe das programações dos jovens — do cardápio ao
          almoxarifado, num só lugar.
        </p>
      </div>

      <div className="relative mx-auto my-8">
        <span
          aria-hidden
          className="absolute bottom-3 left-1/2 h-4 w-[58%] -translate-x-1/2 rounded-full bg-black/40 blur-md"
        />
        <AppLogo
          alt=""
          variant="white"
          width={280}
          height={336}
          fetchPriority="high"
          className="relative h-64 w-auto drop-shadow-xl xl:h-72"
        />
      </div>

      <ul className="relative space-y-3">
        {PILLARS.map((pillar) => (
          <PillarRow key={pillar.title} icon={pillar.icon} title={pillar.title} />
        ))}
      </ul>
    </aside>
  );
}

function PillarRow({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/50 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
    </li>
  );
}
