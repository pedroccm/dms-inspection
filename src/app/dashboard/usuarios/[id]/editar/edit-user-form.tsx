"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateUser } from "../../actions";
import type { Profile } from "@/lib/types";

interface EditUserFormProps {
  profile: Profile;
  email: string;
}

export function EditUserForm({ profile, email }: EditUserFormProps) {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error: string } | null, formData: FormData) => {
      const result = await updateUser(profile.id, formData);
      return result ?? null;
    },
    null
  );

  return (
    <form action={formAction} className="bg-white rounded-lg shadow p-6 space-y-6">
      {state?.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nome completo
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          required
          defaultValue={profile.full_name}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          E-mail
        </label>
        <input
          type="email"
          id="email"
          value={email}
          disabled
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Função
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={profile.role}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] outline-none bg-white"
        >
          <option value="admin">Master</option>
          <option value="inspector">Executor</option>
        </select>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-[#F5A623] rounded-lg hover:bg-[#E8941E] transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <Link
          href="/dashboard/usuarios"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
