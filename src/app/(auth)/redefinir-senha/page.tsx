"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const isFormValid =
    password.length >= 6 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError("Erro ao redefinir senha. O link pode ter expirado.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
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
          Redefinir senha
        </h1>
        <p className="mt-2 text-gray-600">Escolha uma nova senha</p>
      </div>

      {/* Success message */}
      {success ? (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          Senha redefinida com sucesso! Redirecionando para o login...
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
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nova senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                  placeholder="Mínimo 6 caracteres"
                />
                {passwordTooShort && (
                  <p className="mt-1 text-xs text-red-600">
                    A senha deve ter no mínimo 6 caracteres.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none"
                  placeholder="Repita a senha"
                />
                {passwordsMismatch && (
                  <p className="mt-1 text-xs text-red-600">
                    As senhas não coincidem.
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full rounded-lg bg-[#F5A623] px-4 py-3 text-base font-semibold text-white hover:bg-[#E8941E] focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {loading ? "Redefinindo..." : "Redefinir senha"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
