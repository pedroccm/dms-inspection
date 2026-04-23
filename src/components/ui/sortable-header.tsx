"use client";

export type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  field: string;
  label: string;
  sortField: string | null;
  sortDir: SortDirection;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHeader({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isActive = sortField === field;
  const arrow = !isActive ? "↕" : sortDir === "asc" ? "▲" : "▼";

  return (
    <th
      className={`text-left px-6 py-4 text-sm font-semibold text-white ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-[#F5A623] transition-colors cursor-pointer"
        aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        <span
          className={`text-xs ${
            isActive ? "text-[#F5A623]" : "text-white/60"
          }`}
          aria-hidden="true"
        >
          {arrow}
        </span>
      </button>
    </th>
  );
}
