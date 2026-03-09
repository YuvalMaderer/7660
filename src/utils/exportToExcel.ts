import * as XLSX from 'xlsx';
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

export function exportToExcel(entries: AnchorEntry[], filename = 'רשימת_עוגן.xlsx') {
  const rows = entries.map((e) => {
    const row: Record<string, string> = {};
    (Object.keys(COLUMN_MAP) as (keyof AnchorEntry)[]).forEach((key) => {
      if (key !== 'id') row[COLUMN_MAP[key]] = String(e[key] ?? '');
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'רשימת עוגן');
  XLSX.writeFile(wb, filename);
}
