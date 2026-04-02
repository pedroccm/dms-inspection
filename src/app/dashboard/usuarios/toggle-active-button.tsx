"use client";

import { toggleUserActive } from "./actions";

interface ToggleActiveButtonProps {
  userId: string;
  active: boolean;
}

export function ToggleActiveButton({ userId, active }: ToggleActiveButtonProps) {
  return (
    <button
      onClick={async () => {
        await toggleUserActive(userId);
      }}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
        active
          ? "text-red-600 bg-red-50 hover:bg-red-100"
          : "text-green-600 bg-green-50 hover:bg-green-100"
      }`}
    >
      {active ? "Desativar" : "Ativar"}
    </button>
  );
}
