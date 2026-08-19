import type { ReactNode } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/hooks/usePagination';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';

interface PaginatedDataViewProps<T> {
  items: readonly T[];
  pageSize?: number;
  emptyMessage?: ReactNode;
  className?: string;
  paginationClassName?: string;
  children: (pageItems: T[]) => ReactNode;
}

export function PaginatedDataView<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = null,
  className,
  paginationClassName,
  children,
}: PaginatedDataViewProps<T>) {
  const pagination = usePagination(items, pageSize);

  if (items.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null;
  }

  return (
    <div className={className}>
      {children(pagination.paginatedItems)}
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        from={pagination.from}
        to={pagination.to}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        onFirst={pagination.goToFirst}
        onLast={pagination.goToLast}
        onPrevious={pagination.goToPrevious}
        onNext={pagination.goToNext}
        className={paginationClassName}
      />
    </div>
  );
}
