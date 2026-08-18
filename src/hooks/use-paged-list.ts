import { useEffect, useMemo, useState } from "react";

export const TABLE_PAGE_SIZE = 30;

export function usePagedList<T>(
  items: T[],
  resetKey?: unknown,
  pageSize = TABLE_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const current = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((current - 1) * pageSize, current * pageSize),
    [items, current, pageSize],
  );

  return {
    page: current,
    setPage,
    pageCount,
    pageItems,
    total: items.length,
    showPager: items.length > pageSize,
  };
}
