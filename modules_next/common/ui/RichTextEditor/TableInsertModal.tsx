'use client';
import { useState } from 'react';
import { Modal } from '@/modules_next/common/ui/Modal';
import { Input } from '@/modules_next/common/ui/Input';
import { Button } from '@/modules_next/common/ui/Button';

const MAX_DIM = 12;

export function TableInsertModal({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  function clamp(n: number) {
    return Math.max(1, Math.min(MAX_DIM, Math.floor(Number(n) || 1)));
  }

  function commit() {
    onInsert(clamp(rows), clamp(cols));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Insert table"
      description="Pick the size from the grid or type values."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={commit}>Insert {clamp(rows)}×{clamp(cols)}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          role="grid"
          aria-label="Table size picker"
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${MAX_DIM}, 1.25rem)` }}
          onMouseLeave={() => { setHoverRow(null); setHoverCol(null); }}
        >
          {Array.from({ length: MAX_DIM * MAX_DIM }).map((_, i) => {
            const r = Math.floor(i / MAX_DIM) + 1;
            const c = (i % MAX_DIM) + 1;
            const active =
              (hoverRow !== null && hoverCol !== null && r <= hoverRow && c <= hoverCol) ||
              (hoverRow === null && r <= rows && c <= cols);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-selected={active}
                onMouseEnter={() => { setHoverRow(r); setHoverCol(c); }}
                onClick={() => { setRows(r); setCols(c); }}
                className={
                  'w-5 h-5 rounded-[2px] border ' +
                  (active
                    ? 'bg-primary border-primary'
                    : 'bg-surface-base border-border hover:border-primary')
                }
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="rte-table-rows"
            label="Rows"
            type="number"
            min={1}
            max={MAX_DIM}
            value={String(rows)}
            onChange={(e) => setRows(clamp(Number(e.target.value)))}
          />
          <Input
            id="rte-table-cols"
            label="Columns"
            type="number"
            min={1}
            max={MAX_DIM}
            value={String(cols)}
            onChange={(e) => setCols(clamp(Number(e.target.value)))}
          />
        </div>
      </div>
    </Modal>
  );
}
