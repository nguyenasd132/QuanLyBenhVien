import React from 'react';
import { cn } from '@/lib/cn';

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  className?: string;
  headerClassName?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyState,
  className,
}: TableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <TableContainer className={className}>
      <TableElement>
        <TableHead>
          <tr>
            {columns.map((col) => (
              <TableHeaderCell key={col.key} className={col.headerClassName}>
                {col.header}
              </TableHeaderCell>
            ))}
          </tr>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={rowKey ? rowKey(row, index) : index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </TableElement>
    </TableContainer>
  );
}

export function TableContainer({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin rounded-2xl border border-[#C7D6EA] bg-white', className)}>
      {children}
    </div>
  );
}

export function TableElement({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn('w-full border-collapse text-left text-sm', className)} {...props}>
      {children}
    </table>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-[#E8F0FA] border-b border-[#C7D6EA]', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('divide-y divide-[#C7D6EA]', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-[#EDF3FB] transition-colors', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHeaderCell({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3.5 text-sm text-slate-800 align-middle', className)} {...props}>
      {children}
    </td>
  );
}
