"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth.api";
import { ApiClientError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth.store";
import { DemoRequestForm } from "@/components/forms/demo-request-form";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("admin@bakimevi.com");
  const [password, setPassword] = useState("Admin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "demo">("login");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await authApi.login(email, password);
      setSession(result.user, result.accessToken);
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Giriş yapılamadı. Lütfen bilgileri kontrol edin.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.10),_transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
      <section className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-card">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white">
            <ShieldCheck className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-bold text-text">BakımEvi</h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "login" ? "Şirket içi hasta yönetim sistemi" : "Yeni kurum kaydı talebi"}
          </p>
        </div>

        {mode === "login" ? (
          <>
            <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-text">E-posta</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="focus-ring w-full rounded-xl border border-border px-4 py-3 text-text"
                  placeholder="admin@bakimevi.com"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-text">Şifre</span>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    className="focus-ring w-full rounded-xl border border-border px-4 py-3 pr-12 text-text"
                    placeholder="Şifreniz"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:bg-surface"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
              </button>
            </form>

            <button
              onClick={() => setMode("demo")}
              className="mt-5 w-full text-center text-sm font-semibold text-primary hover:underline"
            >
              Kurum musunuz? Demo Talep Edin
            </button>
          </>
        ) : (
          <DemoRequestForm onDone={() => setMode("login")} />
        )}
      </section>
    </main>
  );
}
