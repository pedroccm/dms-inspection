"use client";

import { useActionState } from "react";
import { deleteClientAction } from "./actions";

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [, formAction, pending] = useActionState(
    async () => {
      if (!confirm("Tem certeza que deseja excluir este cliente?")) return null;
      return deleteClientAction(clientId);
    },
    null
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors min-h-[44px] disabled:opacity-50"
      >
        {pending ? "..." : "Excluir"}
      </button>
    </form>
  );
}
