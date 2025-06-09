import React, { PropsWithChildren } from 'react';

const TableRoot = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div className="rounded-xl overflow-hidden border border-cyan-400/30 shadow-glow-sm">
      <table
        ref={ref}
        className={`w-full bg-black/30 backdrop-blur-md ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);
TableRoot.displayName = 'Table';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> & {
  Header: React.FC<PropsWithChildren<React.HTMLAttributes<HTMLTableSectionElement>>>;
  Body: React.FC<PropsWithChildren<React.HTMLAttributes<HTMLTableSectionElement>>>;
  Row: React.FC<React.HTMLAttributes<HTMLTableRowElement>>;
  Cell: React.FC<React.TdHTMLAttributes<HTMLTableDataCellElement>>;
  HeaderRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>>;
  HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement>>;
} = Object.assign(
  TableRoot,
  {
    Header: ({ children, ...props }: PropsWithChildren<React.HTMLAttributes<HTMLTableSectionElement>>) => <thead {...props}>{children}</thead>,
    Body: ({ children, ...props }: PropsWithChildren<React.HTMLAttributes<HTMLTableSectionElement>>) => <tbody {...props}>{children}</tbody>,
    Row: ({ className = '', ...props }) => (
      <tr className={`border-b border-cyan-400/10 hover:bg-cyan-400/10 transition-colors duration-200 ${className}`} {...props} />
    ),
    Cell: ({ className = '', ...props }) => (
      <td className={`px-4 py-3 text-white/90 ${className}`} {...props} />
    ),
    HeaderRow: ({ className = '', ...props }) => (
      <tr className={`bg-cyan-900/30 border-b border-cyan-400/20 ${className}`} {...props} />
    ),
    HeaderCell: ({ className = '', ...props }) => (
      <th className={`px-4 py-3 text-cyan-300 font-bold text-left text-xs uppercase tracking-wider ${className}`} {...props} />
    ),
  }
);

Table.Header.displayName = 'TableHeader';
Table.Body.displayName = 'TableBody';
Table.Row.displayName = 'TableRow';
Table.Cell.displayName = 'TableCell';
Table.HeaderRow.displayName = 'TableHeaderRow';
Table.HeaderCell.displayName = 'TableHeaderCell'; 