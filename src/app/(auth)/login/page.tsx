"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isFormValid = email.trim() !== "" && password.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // RF-01: Validar domínio @dms.eng.br
      if (!email.trim().toLowerCase().endsWith("@dms.eng.br")) {
        setError("Apenas e-mails com domínio @dms.eng.br são permitidos.");
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError("E-mail ou senha inválidos");
        setLoading(false);
        return;
      }

      // Check if user profile is active
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("active")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile?.active) {
        await supabase.auth.signOut();
        setError("Sua conta está desativada. Entre em contato com o administrador.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Brand area */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B2B5E] text-[#F5A623] text-2xl font-bold">
          D&gt;
        </div>
        <h1 className="mt-4 text-3xl font-bold text-[#1B2B5E]">
          DMS Inspection
        </h1>
        <p className="mt-2 text-gray-600">
          DIEN Soluções em Engenharia
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-base text-gray-900 placeholder-gray-400 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="w-full rounded-lg bg-[#F5A623] px-4 py-3 text-base font-semibold text-white hover:bg-[#E8941E] focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div className="text-center">
          <Link
            href="/esqueci-senha"
            className="text-sm font-medium text-[#F5A623] hover:text-[#E8941E]"
          >
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </div>
  );
}
