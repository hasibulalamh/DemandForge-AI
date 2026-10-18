import Link from "next/link";

import { cn } from "@/lib/utils";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  query,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const suffix = params.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  };

  const previous = page > 1 ? hrefFor(page - 1) : null;
  const next = page < pages ? hrefFor(page + 1) : null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500"
    >
      <p>
        Showing <span className="font-medium text-zinc-700">{from}</span>–
        <span className="font-medium text-zinc-700">{to}</span> of{" "}
        <span className="font-medium text-zinc-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={previous ?? hrefFor(page)}
          aria-disabled={!previous}
          tabIndex={previous ? undefined : -1}
          className={cn(
            "rounded-md border border-zinc-200 px-3 py-1.5 font-medium",
            previous
              ? "bg-white text-zinc-700 hover:bg-zinc-50"
              : "pointer-events-none bg-zinc-50 text-zinc-300",
          )}
        >
          Previous
        </Link>
        <span className="px-1">
          Page {page} of {pages}
        </span>
        <Link
          href={next ?? hrefFor(page)}
          aria-disabled={!next}
          tabIndex={next ? undefined : -1}
          className={cn(
            "rounded-md border border-zinc-200 px-3 py-1.5 font-medium",
            next ? "bg-white text-zinc-700 hover:bg-zinc-50" : "pointer-events-none bg-zinc-50 text-zinc-300",
          )}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
