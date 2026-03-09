import type { AnchorEntry } from '../types/anchorList';

interface DuplicateConfirmDialogProps {
  existing: AnchorEntry;
  newEntry: Omit<AnchorEntry, 'id'>;
  onSamePerson: () => void;
  onDifferentPerson: () => void;
}

function formatEntry(e: { firstName: string; lastName: string; idNumber: string }) {
  const name = [e.firstName, e.lastName].filter(Boolean).join(' ') || '—';
  const id = e.idNumber ? `ת.ז ${e.idNumber}` : '';
  return [name, id].filter(Boolean).join(', ');
}

export function DuplicateConfirmDialog({
  existing,
  newEntry,
  onSamePerson,
  onDifferentPerson,
}: DuplicateConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-dialog-title"
    >
      <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 id="duplicate-dialog-title" className="mb-3 text-lg font-semibold text-slate-800">
          התאמה קיימת ברשימה
        </h3>
        <p className="mb-2 text-sm text-slate-600">
          קיים ברשימה: <strong>{formatEntry(existing)}</strong>
        </p>
        <p className="mb-4 text-sm text-slate-500">
          מנסים להוסיף: <strong>{formatEntry(newEntry)}</strong>
        </p>
        <p className="mb-4 text-sm text-slate-600">
          האם מדובר באותו אדם?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSamePerson}
            className="flex-1 rounded-lg bg-slate-200 px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-300 transition-colors"
          >
            כן, אותו אדם
          </button>
          <button
            type="button"
            onClick={onDifferentPerson}
            className="flex-1 rounded-lg bg-amber-500 px-4 py-2.5 font-medium text-white hover:bg-amber-600 transition-colors"
          >
            לא, אדם שונה
          </button>
        </div>
      </div>
    </div>
  );
}
