import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  emptySubtext?: string;
  footer?: React.ReactNode;
  maxHeight?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found',
  emptySubtext = 'There are no active entries in this view.',
  footer,
  maxHeight
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 px-4 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
        <p className="text-xs font-semibold text-slate-700">{emptyMessage}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{emptySubtext}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div 
        className="w-full overflow-x-auto rounded-lg border border-slate-200/80"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-2.5 px-3.5 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {data.map((item, idx) => (
              <tr 
                key={keyExtractor(item, idx)} 
                className="hover:bg-slate-50/70 transition-colors group"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-2.5 px-3.5 text-slate-700 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.render ? col.render(item, idx) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
          {footer}
        </div>
      )}
    </div>
  );
}

export default DataTable;
