import { useEffect, useRef, useState } from 'react';
import type { AnchorEntry } from '../types/anchorList';
import { StatusSelect } from './StatusSelect';

interface AnchorListTableProps {
  entries: AnchorEntry[];
  onUpdate: (id: string, field: keyof AnchorEntry, value: string) => void;
  onDelete: (id: string) => void;
  onDeleteSelected?: (ids: string[]) => void;
}

type SortKey = 'lastName' | 'firstName' | 'status' | 'lifeStatus';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof AnchorEntry; label: string; editable?: boolean; type?: 'select'; sortable?: boolean }[] = [
  { key: 'event', label: 'אירוע', editable: true },
  { key: 'firstName', label: 'שם פרטי', editable: true, sortable: true },
  { key: 'lastName', label: 'שם משפחה', editable: true, sortable: true },
  { key: 'idNumber', label: 'ת.ז/דרכון', editable: true },
  { key: 'floor', label: 'קומה', editable: true },
  { key: 'apartment', label: 'דירה', editable: true },
  { key: 'phone', label: 'טלפון', editable: true },
  { key: 'notes', label: 'הערות', editable: true },
  { key: 'evacuationPlace', label: 'מקום פינוי', editable: true },
  { key: 'status', label: 'סטטוס', editable: true, type: 'select', sortable: true },
  { key: 'lifeStatus', label: 'חי/חלל', editable: true, sortable: true },
  { key: 'reported', label: 'מדווח', editable: true },
];

function filterBySearch(entries: AnchorEntry[], q: string): AnchorEntry[] {
  const term = q.replace(/\s+/g, ' ').trim();
  if (!term) return entries;
  const t = term.toLowerCase();
  return entries.filter(
    (e) =>
      (e.firstName || '').toLowerCase().includes(t) ||
      (e.lastName || '').toLowerCase().includes(t) ||
      (e.idNumber || '').replace(/\s/g, '').includes(term.replace(/\s/g, '')) ||
      (e.phone || '').replace(/\s/g, '').includes(term.replace(/\s/g, '')) ||
      (e.notes || '').toLowerCase().includes(t)
  );
}

function sortEntries(entries: AnchorEntry[], sortBy: SortKey, sortDir: SortDir): AnchorEntry[] {
  const mult = sortDir === 'asc' ? 1 : -1;
  return [...entries].sort((a, b) => {
    let cmp = (a[sortBy] || '').localeCompare(b[sortBy] || '', 'he');
    if (cmp === 0 && (sortBy === 'lastName' || sortBy === 'firstName')) {
      const other: SortKey = sortBy === 'lastName' ? 'firstName' : 'lastName';
      cmp = (a[other] || '').localeCompare(b[other] || '', 'he');
    }
    return mult * cmp;
  });
}

export function AnchorListTable({ entries, onUpdate, onDelete, onDeleteSelected }: AnchorListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const selectedCount = selectedIds.size;

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const filteredEntries = filterBySearch(entries, searchQuery);
  const displayedEntries = sortBy ? sortEntries(filteredEntries, sortBy, sortDir) : filteredEntries;

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (!el) return;
    el.indeterminate = selectedCount > 0 && selectedCount < displayedEntries.length;
  }, [selectedCount, displayedEntries.length]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCount === displayedEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedEntries.map((e) => e.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCount === 0) return;
    if (window.confirm(`למחוק ${selectedCount} רשומות נבחרות?`)) {
      onDeleteSelected?.(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-12 text-center text-slate-500">
        אין רשומות. הזן מידע למעלה או הוסף ידנית.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <label htmlFor="table-search" className="sr-only">
          חפש לפי שם, ת.ז, טלפון או הערות
        </label>
        <input
          id="table-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="חפש לפי שם, ת.ז, טלפון או הערות..."
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        {searchQuery && (
          <span className="text-sm text-slate-500">
            {displayedEntries.length} תוצאות
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
      {selectedCount > 0 && onDeleteSelected && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-100">
          <span className="text-sm text-slate-600">{selectedCount} נבחרו</span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            מחק נבחרים
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            בטל בחירה
          </button>
        </div>
      )}
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-amber-50 border-b border-amber-100">
            <th className="w-10 px-2 py-3">
              {onDeleteSelected && (
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={selectedCount === displayedEntries.length && displayedEntries.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-400"
                />
              )}
            </th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="px-4 py-3 text-right font-semibold text-slate-700">
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key as SortKey)}
                    className="inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-amber-100 transition-colors"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span className="text-amber-600" aria-hidden="true">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th className="w-20 px-2 py-3 text-slate-500 font-normal">מחיקה</th>
          </tr>
        </thead>
        <tbody>
          {displayedEntries.map((entry) => (
            <tr
              key={entry.id}
              className={`border-b border-slate-100 transition-colors ${selectedIds.has(entry.id) ? 'bg-amber-100/60' : 'hover:bg-amber-50/50'}`}
            >
              <td className="w-10 px-2 py-2 align-middle">
                {onDeleteSelected && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-400"
                  />
                )}
              </td>
              {COLUMNS.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  {col.type === 'select' && col.key === 'status' ? (
                    <StatusSelect
                      value={entry.status}
                      onChange={(v) => onUpdate(entry.id, 'status', v)}
                    />
                  ) : col.editable ? (
                    <input
                      type="text"
                      value={entry[col.key] as string}
                      onChange={(e) => onUpdate(entry.id, col.key, e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  ) : (
                    <span>{String(entry[col.key] ?? '')}</span>
                  )}
                </td>
              ))}
              <td className="px-2 py-2 align-middle">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm('למחוק את הרשומה?')) {
                      onDelete(entry.id);
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm font-medium transition-colors cursor-pointer"
                  title="מחק רשומה"
                >
                  מחק
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
