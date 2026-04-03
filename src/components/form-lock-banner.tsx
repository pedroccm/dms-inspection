"use client";

interface FormLockBannerProps {
  lockedBy: string;
  lockedAt: string | null;
}

export function FormLockBanner({ lockedBy, lockedAt }: FormLockBannerProps) {
  const timeString = lockedAt
    ? new Date(lockedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 flex items-start gap-3">
      <span className="text-yellow-600 text-xl shrink-0" aria-hidden="true">
        🔒
      </span>
      <div>
        <p className="text-sm font-medium text-yellow-800">
          Formulário em edição
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          Este formulário está sendo editado por{" "}
          <span className="font-semibold">{lockedBy}</span>
          {timeString && <> desde {timeString}</>}. Tente novamente mais tarde.
        </p>
      </div>
    </div>
  );
}
