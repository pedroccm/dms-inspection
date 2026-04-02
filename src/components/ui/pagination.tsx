import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Base path without query params, e.g. "/dashboard/equipamentos" */
  basePath: string;
  /** Extra search params to preserve (besides "page") */
  searchParams?: Record<string, string>;
}

function buildHref(
  basePath: string,
  page: number,
  searchParams?: Record<string, string>
) {
  const params = new URLSearchParams(searchParams ?? {});
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = Math.max(1, current - 2);
  let end = Math.min(total, start + 4);

  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  const linkClass =
    "inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-colors";

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6"
    >
      <p className="text-sm text-gray-600">
        Página {currentPage} de {totalPages}
      </p>

      <div className="flex items-center gap-1">
        {isFirst ? (
          <span
            className={`${linkClass} text-gray-300 cursor-not-allowed`}
            aria-disabled="true"
          >
            Anterior
          </span>
        ) : (
          <Link
            href={buildHref(basePath, currentPage - 1, searchParams)}
            className={`${linkClass} text-gray-700 hover:bg-gray-100`}
          >
            Anterior
          </Link>
        )}

        {pages.map((page) => (
          <Link
            key={page}
            href={buildHref(basePath, page, searchParams)}
            className={`${linkClass} ${
              page === currentPage
                ? "bg-[#F5A623] text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Link>
        ))}

        {isLast ? (
          <span
            className={`${linkClass} text-gray-300 cursor-not-allowed`}
            aria-disabled="true"
          >
            Próxima
          </span>
        ) : (
          <Link
            href={buildHref(basePath, currentPage + 1, searchParams)}
            className={`${linkClass} text-gray-700 hover:bg-gray-100`}
          >
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
