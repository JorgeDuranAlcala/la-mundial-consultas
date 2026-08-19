import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAGE_SIZE_OPTIONS } from '@/hooks/usePagination';
import { Button } from './Button';
import { Select } from './Input';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onFirst?: () => void;
  onLast?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  onFirst,
  onLast,
  onPrevious,
  onNext,
  className,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const goFirst = onFirst ?? (() => onPageChange(1));
  const goLast = onLast ?? (() => onPageChange(totalPages));
  const goPrevious = onPrevious ?? (() => onPageChange(Math.max(1, page - 1)));
  const goNext = onNext ?? (() => onPageChange(Math.min(totalPages, page + 1)));

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-6 py-4 text-[13px]',
        className,
      )}
    >
      <p className="text-on-surface-variant">
        Mostrando {from}–{to} de {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-on-surface-variant">
          Filas por página
          <Select
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-auto min-w-[4.5rem] py-1.5 text-[13px]"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1.5"
            onClick={goFirst}
            disabled={page <= 1}
            title="Primera página"
          >
            <ChevronsLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1.5"
            onClick={goPrevious}
            disabled={page <= 1}
            title="Página anterior"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-[5rem] text-center text-on-surface">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1.5"
            onClick={goNext}
            disabled={page >= totalPages}
            title="Página siguiente"
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="px-2 py-1.5"
            onClick={goLast}
            disabled={page >= totalPages}
            title="Última página"
          >
            <ChevronsRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
