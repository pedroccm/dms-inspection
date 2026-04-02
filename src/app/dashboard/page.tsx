export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Painel</h1>
      <p className="mt-2 text-gray-600">
        Bem-vindo ao sistema de inspeção DMS.
      </p>

      {/* Placeholder stats cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Ordens Abertas", value: "—" },
          { label: "Inspeções Hoje", value: "—" },
          { label: "Equipamentos", value: "—" },
          { label: "Pendentes de Revisão", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
