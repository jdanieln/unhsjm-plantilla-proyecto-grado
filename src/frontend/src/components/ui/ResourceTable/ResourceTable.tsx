"use client";
import type { ReactNode } from "react";
import { DataState, Pagination, workspaceStyles as s } from "../Workspace/Workspace";

export function ResourceTable<T>({ rows, columns, rowKey, loading, error, onRetry, page, perPage, total, onPage, onPerPage }: {
  rows: T[]; columns: { label: string; render: (row: T) => ReactNode }[];
  rowKey: (row: T) => string | number; loading: boolean; error?: string; onRetry: () => void;
  page: number; perPage: number; total: number; onPage: (page: number) => void; onPerPage: (size: number) => void;
}) {
  return <div className={s.card}>
    {loading || error || !rows.length ? <DataState loading={loading} error={error} empty="No hay registros para mostrar" onRetry={onRetry} /> :
      <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Listado desplazable">
        <table className={s.table}><thead><tr>{columns.map((column) => <th scope="col" key={column.label}>{column.label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.label}>{column.render(row)}</td>)}</tr>)}</tbody>
        </table>
      </div>}
    <Pagination page={page} perPage={perPage} total={total} lastPage={Math.max(1, Math.ceil(total / perPage))}
      onPage={onPage} onPerPage={onPerPage} disabled={loading} />
  </div>;
}
