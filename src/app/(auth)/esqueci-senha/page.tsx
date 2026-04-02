"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = email.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        }
      );

      if (resetError) {
        setError("Erro ao enviar o link. Tente novamente.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
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
          Esqueci minha senha
        </h1>
        <p className="mt-2 text-gray-600">
          Informe seu e-mail para receber o link de recuperação
        </p>
      </div>

      {/* Success message */}
      {submitted ? (
        <div className="space-y-6">
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            Se este e-mail estiver cadastrado, você receberá um link de
            recuperação.
          </div>
          <Link
            href="/login"
            className="block w-full text-center rounded-lg bg-[#F5A623] px-4 py-3 text-base font-semibold text-white hover:bg-[#E8941E] transition-colors min-h-[44px]"
          >
            Voltar para login
          </Link>
        </div>
      ) : (
        <>
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

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full rounded-lg bg-[#F5A623] px-4 py-3 text-base font-semibold text-white hover:bg-[#E8941E] focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-[#F5A623] hover:text-[#E8941E]"
            >
              Voltar para login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
