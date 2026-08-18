import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { linkCurrentUser, loginWithEmail } from "@/lib/apoio.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
    <main className="grid min-h-screen place-items-center bg-secondary px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 grid size-11 place-items-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">
            A
          </div>
          <CardTitle className="font-display text-2xl">Ministério Apoio</CardTitle>
          <CardDescription>
            {awaitingOtp
              ? `Digite o código enviado para ${email}.`
              : "Entre só com o e-mail cadastrado. Sem senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {awaitingOtp ? (
            <form onSubmit={confirmOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Código</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Aguarde..." : "Entrar"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => {
                  setAwaitingOtp(false);
                  setOtp("");
                }}
              >
                Usar outro e-mail
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
