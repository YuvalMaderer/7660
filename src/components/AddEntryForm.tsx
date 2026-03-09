import { useState } from 'react';
import type { AnchorEntry, LifeStatus } from '../types/anchorList';
import { StatusSelect } from './StatusSelect';

interface AddEntryFormProps {
  onAdd: (entry: Omit<AnchorEntry, 'id'>) => Promise<boolean>;
}

const emptyEntry = (): Omit<AnchorEntry, 'id'> => ({
  event: '',
  firstName: '',
  lastName: '',
  idNumber: '',
  floor: '',
  apartment: '',
  phone: '',
  notes: '',
  evacuationPlace: '',
  status: 'נעדר',
  lifeStatus: '',
  reported: '',
});

export function AddEntryForm({ onAdd }: AddEntryFormProps) {
  const [form, setForm] = useState(emptyEntry());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const added = await onAdd(form);
    if (added) setForm(emptyEntry());
  };

  const update = (field: keyof Omit<AnchorEntry, 'id'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h3 className="mb-4 text-lg font-semibold text-slate-800">הוסף רשומה חדשה</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <div>
          <label htmlFor="add-event" className="mb-1 block text-xs font-medium text-slate-600">אירוע</label>
          <input
            id="add-event"
            type="text"
            value={form.event}
            onChange={(e) => update('event', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="שם אירוע"
          />
        </div>
        <div>
          <label htmlFor="add-firstName" className="mb-1 block text-xs font-medium text-slate-600">שם פרטי</label>
          <input
            id="add-firstName"
            type="text"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="add-lastName" className="mb-1 block text-xs font-medium text-slate-600">שם משפחה</label>
          <input
            id="add-lastName"
            type="text"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-idNumber" className="mb-1 block text-xs font-medium text-slate-600">ת.ז/דרכון</label>
          <input
            id="add-idNumber"
            type="text"
            value={form.idNumber}
            onChange={(e) => update('idNumber', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-floor" className="mb-1 block text-xs font-medium text-slate-600">קומה</label>
          <input
            id="add-floor"
            type="text"
            value={form.floor}
            onChange={(e) => update('floor', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-apartment" className="mb-1 block text-xs font-medium text-slate-600">דירה</label>
          <input
            id="add-apartment"
            type="text"
            value={form.apartment}
            onChange={(e) => update('apartment', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-phone" className="mb-1 block text-xs font-medium text-slate-600">טלפון</label>
          <input
            id="add-phone"
            type="text"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-status" className="mb-1 block text-xs font-medium text-slate-600">סטטוס</label>
          <StatusSelect
            id="add-status"
            value={form.status}
            onChange={(v) => update('status', v)}
          />
        </div>
        <div>
          <label htmlFor="add-lifeStatus" className="mb-1 block text-xs font-medium text-slate-600">חי/חלל</label>
          <select
            id="add-lifeStatus"
            value={form.lifeStatus}
            onChange={(e) => update('lifeStatus', e.target.value as LifeStatus)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="חי">חי</option>
            <option value="חלל">חלל</option>
          </select>
        </div>
        <div>
          <label htmlFor="add-notes" className="mb-1 block text-xs font-medium text-slate-600">הערות</label>
          <input
            id="add-notes"
            type="text"
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-evacuationPlace" className="mb-1 block text-xs font-medium text-slate-600">מקום פינוי</label>
          <input
            id="add-evacuationPlace"
            type="text"
            value={form.evacuationPlace}
            onChange={(e) => update('evacuationPlace', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="add-reported" className="mb-1 block text-xs font-medium text-slate-600">מדווח</label>
          <input
            id="add-reported"
            type="text"
            value={form.reported}
            onChange={(e) => update('reported', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-6 py-2.5 font-medium text-white hover:bg-amber-600 transition-colors"
        >
          הוסף לרשימה
        </button>
      </div>
    </form>
  );
}
