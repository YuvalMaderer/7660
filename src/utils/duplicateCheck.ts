import type { AnchorEntry } from '../types/anchorList';

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function normalizeId(id: string): string {
  return id.replace(/[\s\-]/g, '').trim();
}

export type EntryLike = Pick<AnchorEntry, 'firstName' | 'lastName' | 'idNumber'>;

/**
 * Finds a potential duplicate in the list by:
 * - Same first name + last name (normalized), OR
 * - Same ID number (when both are non-empty)
 */
export function findPotentialDuplicate(
  newEntry: EntryLike,
  existingEntries: AnchorEntry[]
): AnchorEntry | null {
  const fn = normalize(newEntry.firstName);
  const ln = normalize(newEntry.lastName);
  const id = normalizeId(newEntry.idNumber);
  const hasId = id.length > 0;

  for (const e of existingEntries) {
    const matchById = hasId && normalizeId(e.idNumber).length > 0 && normalizeId(e.idNumber) === id;
    const matchByName =
      fn.length > 0 &&
      ln.length > 0 &&
      normalize(e.firstName) === fn &&
      normalize(e.lastName) === ln;

    if (matchById || matchByName) return e;
  }
  return null;
}
