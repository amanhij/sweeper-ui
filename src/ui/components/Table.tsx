import React, { PropsWithChildren } from 'react';

const TableRoot = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className = '', children, ...props }, ref) => (
    <table
      ref={ref}
      className={`w-full rounded-xl bg-white/10 backdrop-blur-md shadow-lg border border-cyan-400/30 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </table>
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
      <tr className={`hover:bg-cyan-400/10 transition ${className}`} {...props} />
    ),
    Cell: ({ className = '', ...props }) => (
      <td className={`px-4 py-3 text-white/90 ${className}`} {...props} />
    ),
    HeaderRow: ({ className = '', ...props }) => (
      <tr className={`bg-cyan-400/10 ${className}`} {...props} />
    ),
    HeaderCell: ({ className = '', ...props }) => (
      <th className={`px-4 py-3 text-cyan-300 font-bold text-left ${className}`} {...props} />
    ),
  }
);

Table.Header.displayName = 'TableHeader';
Table.Body.displayName = 'TableBody';
Table.Row.displayName = 'TableRow';
Table.Cell.displayName = 'TableCell';
Table.HeaderRow.displayName = 'TableHeaderRow';
Table.HeaderCell.displayName = 'TableHeaderCell'; 