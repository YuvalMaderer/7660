import type { AnchorEntry } from '../types/anchorList';

const COLUMN_MAP: Record<keyof AnchorEntry, string> = {
  id: 'מזהה',
  event: 'אירוע',
  firstName: 'שם פרטי',
  lastName: 'שם משפחה',
  idNumber: 'תעודת זהות/דרכון',
  floor: 'קומה',
  apartment: 'דירה',
  phone: 'טלפון',
  notes: 'הערות',
  evacuationPlace: 'מקום פינוי',
  status: 'סטטוס',
  lifeStatus: 'חי/חלל',
  reported: 'מדווח',
};

/** Convert entries to row format for Google Sheets (same as Excel export) */
function entriesToRows(entries: AnchorEntry[]): Record<string, string>[] {
  return entries.map((e) => {
    const row: Record<string, string> = {};
    (Object.keys(COLUMN_MAP) as (keyof AnchorEntry)[]).forEach((key) => {
      if (key !== 'id') row[COLUMN_MAP[key]] = String(e[key] ?? '');
    });
    return row;
  });
}

const REVERSE_MAP: Record<string, keyof AnchorEntry> = {
  'אירוע': 'event',
  'שם פרטי': 'firstName',
  'שם משפחה': 'lastName',
  'תעודת זהות/דרכון': 'idNumber',
  'קומה': 'floor',
  'דירה': 'apartment',
  'טלפון': 'phone',
  'הערות': 'notes',
  'מקום פינוי': 'evacuationPlace',
  'סטטוס': 'status',
  'חי/חלל': 'lifeStatus',
  'מדווח': 'reported',
};

const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function apiFetch(url: string, opts?: RequestInit): Promise<unknown> {
  const res = await fetch(API_BASE + url, opts);
  const text = await res.text();
  if (text.startsWith('<')) {
    throw new Error('השרת לא רץ – הרץ: npm run server (פורט 3001)');
  }
  const data = JSON.parse(text);
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `שגיאה: ${res.status}`);
  return data;
}

/** Load entries from Google Sheets */
export async function loadFromGoogleSheets(): Promise<AnchorEntry[]> {
  const data = (await apiFetch('/api/load-sheets')) as { rows?: Record<string, string>[] };
  const rows: Record<string, string>[] = data?.rows ?? [];
  return rows.map((r, i) => {
    const e: Record<string, string> = { id: `sheet-${Date.now()}-${i}` };
    Object.entries(r).forEach(([heb, val]) => {
      const key = REVERSE_MAP[heb];
      if (key) e[key] = String(val ?? '');
    });
    return {
      id: e.id ?? crypto.randomUUID?.(),
      event: e.event ?? '',
      firstName: e.firstName ?? '',
      lastName: e.lastName ?? '',
      idNumber: e.idNumber ?? '',
      floor: e.floor ?? '',
      apartment: e.apartment ?? '',
      phone: e.phone ?? '',
      notes: e.notes ?? '',
      evacuationPlace: e.evacuationPlace ?? '',
      status: (e.status as AnchorEntry['status']) ?? 'נעדר',
      lifeStatus: (e.lifeStatus as AnchorEntry['lifeStatus']) ?? '',
      reported: e.reported ?? '',
    };
  });
}

/**
 * Delete a row from Google Sheets by 1-based row index.
 * rowIndex 2 = first data row (row 1 = headers).
 */
export async function deleteRowFromGoogleSheets(rowIndex: number): Promise<void> {
  const res = await fetch(API_BASE + '/api/delete-sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', rowIndex }),
  });
  const text = await res.text();
  if (text.startsWith('<')) {
    throw new Error('השרת לא רץ – הרץ: npm run server (פורט 3001)');
  }
  const data = JSON.parse(text) as { error?: string };
  if (!res.ok) throw new Error(data?.error ?? `שגיאה: ${res.status}`);
}

/** Sync entries to Google Sheets (via backend proxy → Apps Script) */
export async function syncToGoogleSheets(entries: AnchorEntry[]): Promise<void> {
  const rows = entriesToRows(entries);
  const res = await fetch(API_BASE + '/api/sync-sheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', rows }),
  });
  const text = await res.text();
  if (text.startsWith('<')) {
    throw new Error('השרת לא רץ – הרץ: npm run server (פורט 3001)');
  }
  const err = JSON.parse(text) as { error?: string };
  if (!res.ok) throw new Error(err?.error ?? `שגיאה: ${res.status}`);
}
