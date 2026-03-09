export type AnchorStatus =
  | 'נעדר'
  | 'לכוד סמוי'
  | 'לכוד מאותר'
  | 'לכוד גלוי'
  | 'אותר'
  | 'פונה'
  | 'חולץ';

export type LifeStatus = 'חי' | 'חלל' | '';

export interface AnchorEntry {
  id: string;
  event: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  floor: string;
  apartment: string;
  phone: string;
  notes: string;
  evacuationPlace: string;
  status: AnchorStatus;
  lifeStatus: LifeStatus;
  reported: string;
}

export const STATUS_OPTIONS: AnchorStatus[] = [
  'נעדר',
  'לכוד סמוי',
  'לכוד מאותר',
  'לכוד גלוי',
  'אותר',
  'פונה',
  'חולץ',
];
