"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createEquipment } from "../actions";

export function CreateEquipmentForm() {
  const [state, formAction, pending] = useActionState(
    async (_prevState: { error: string } | null, formData: FormData) => {
      const result = await createEquipment(formData);
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

      <Input
        label="Código Copel do RA (Mecanismo)"
        name="copel_ra_code"
        required
        placeholder="Digite o código Copel do RA"
      />

      <Input
        label="Código Copel do Controle"
        name="copel_control_code"
        required
        placeholder="Digite o código Copel do controle"
      />

      <Input
        label="Número de Série do Mecanismo"
        name="mechanism_serial"
        required
        placeholder="Digite o número de série do mecanismo"
      />

      <Input
        label="Número de Série da Caixa de Controle"
        name="control_box_serial"
        required
        placeholder="Digite o número de série da caixa de controle"
      />

      <Input
        label="Número de Série do Relé de Proteção"
        name="protection_relay_serial"
        required
        placeholder="Digite o número de série do relé de proteção"
      />

      <Input
        label="Fabricante do Religador"
        name="manufacturer"
        required
        placeholder="Digite o fabricante do religador"
      />

      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" loading={pending}>
          {pending ? "Cadastrando..." : "Cadastrar"}
        </Button>
        <Link href="/dashboard/equipamentos">
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
