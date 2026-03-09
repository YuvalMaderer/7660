import { useState, useCallback, useEffect, useRef } from 'react';
import { RawInputSection } from './components/RawInputSection';
import { AddEntryForm } from './components/AddEntryForm';
import { AnchorListTable } from './components/AnchorListTable';
import { DuplicateConfirmDialog } from './components/DuplicateConfirmDialog';
import { findPotentialDuplicate } from './utils/duplicateCheck';
import { exportToExcel } from './utils/exportToExcel';
import { syncToGoogleSheets, loadFromGoogleSheets } from './utils/googleSheetsSync';
import type { AnchorEntry, AnchorStatus, LifeStatus } from './types/anchorList';

type ExtractResponse = {
  אנשים?: ExtractedPerson[];
  error?: string;
};

type ExtractedPerson = {
  אירוע?: string;
  שם_פרטי?: string;
  שם_משפחה?: string;
  תעודת_זהות_דרכון?: string;
  קומה?: string;
  דירה?: string;
  טלפון?: string;
  הערות?: string;
  מקום_פינוי?: string;
  סטטוס?: string;
  חי_חלל?: string;
  מדווח?: string;
};

function generateId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function App() {
  const [rawInput, setRawInput] = useState('');
  const [entries, setEntries] = useState<AnchorEntry[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState<string | null>(null);
  const [extractProgressPercent, setExtractProgressPercent] = useState<number | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    existing: AnchorEntry;
    new: Omit<AnchorEntry, 'id'>;
  } | null>(null);
  const duplicateResolveRef = useRef<((add: boolean) => void) | null>(null);

  const confirmDuplicate = useCallback(
    (existing: AnchorEntry, newEntry: Omit<AnchorEntry, 'id'>) => {
      return new Promise<boolean>((resolve) => {
        setPendingDuplicate({ existing, new: newEntry });
        duplicateResolveRef.current = (add: boolean) => {
          duplicateResolveRef.current = null;
          setPendingDuplicate(null);
          resolve(add);
        };
      });
    },
    []
  );

  const handleExtract = useCallback(async () => {
    if (!rawInput.trim()) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractProgress('מתחבר למודל...');
    setExtractProgressPercent(0);
    const estTotal = Math.max(400, Math.min(1500, 250 + Math.floor(rawInput.length * 0.8)));
    try {
      const res = await fetch('/api/extract?stream=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawInput }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `שגיאה ${res.status}`);
      }
      let data: ExtractResponse = {};
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'progress') {
              const chars = msg.chars || 0;
              const pct = Math.min(95, Math.round((chars / estTotal) * 100));
              setExtractProgress(`${chars} תווים התקבלו (בערך ${pct}%)`);
              setExtractProgressPercent(pct);
            } else if (msg.type === 'done' && msg.data) {
              data = msg.data as ExtractResponse;
              setExtractProgress('הושלם');
              setExtractProgressPercent(100);
            }
          } catch (_) {}
        }
      }
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer);
          if (msg.type === 'done' && msg.data) {
            data = msg.data as ExtractResponse;
            setExtractProgressPercent(100);
          }
        } catch (_) {}
      }
      const people = data.אנשים ?? [];
      if (data.error) setExtractError(data.error);
      if (people.length > 0) {
        const created = people.map((p: ExtractedPerson) => ({
          event: String(p.אירוע ?? ''),
          firstName: String(p.שם_פרטי ?? ''),
          lastName: String(p.שם_משפחה ?? ''),
          idNumber: String(p.תעודת_זהות_דרכון ?? ''),
          floor: String(p.קומה ?? ''),
          apartment: String(p.דירה ?? ''),
          phone: String(p.טלפון ?? ''),
          notes: String(p.הערות ?? ''),
          evacuationPlace: String(p.מקום_פינוי ?? ''),
          status: (p.סטטוס as AnchorStatus) ?? 'נעדר',
          lifeStatus: (p.חי_חלל as LifeStatus) ?? '',
          reported: String(p.מדווח ?? ''),
        }));
        const toAdd: AnchorEntry[] = [];
        let runningList = [...entries];
        for (const newEntry of created) {
          const dup = findPotentialDuplicate(newEntry, runningList);
          if (dup) {
            const add = await confirmDuplicate(dup, newEntry);
            if (add) {
              const entry = { ...newEntry, id: generateId() };
              toAdd.push(entry);
              runningList = [entry, ...runningList];
            }
          } else {
            const entry = { ...newEntry, id: generateId() };
            toAdd.push(entry);
            runningList = [entry, ...runningList];
          }
        }
        if (toAdd.length > 0) {
          setEntries((prev) => [...toAdd, ...prev]);
        }
        setRawInput('');
      } else {
        setEntries((prev) => [
          {
            id: generateId(),
            event: '',
            firstName: '',
            lastName: '',
            idNumber: '',
            floor: '',
            apartment: '',
            phone: '',
            notes: rawInput.slice(0, 200),
            evacuationPlace: '',
            status: 'נעדר',
            lifeStatus: '',
            reported: 'הזנה ידנית',
          },
          ...prev,
        ]);
      }
    } catch {
      setEntries((prev) => [
        {
          id: generateId(),
          event: '',
          firstName: '',
          lastName: '',
          idNumber: '',
          floor: '',
          apartment: '',
          phone: '',
          notes: rawInput.slice(0, 200),
          evacuationPlace: '',
          status: 'נעדר',
          lifeStatus: '',
          reported: 'הזנה ידנית',
        },
        ...prev,
      ]);
    } finally {
      setExtractProgress(null);
      setExtractProgressPercent(null);
      setIsExtracting(false);
    }
  }, [rawInput, entries, confirmDuplicate]);

  const handleAddEntry = useCallback(
    async (entry: Omit<AnchorEntry, 'id'>): Promise<boolean> => {
      const dup = findPotentialDuplicate(entry, entries);
      if (dup) {
        const add = await confirmDuplicate(dup, entry);
        if (!add) return false;
      }
      setEntries((prev) => [{ ...entry, id: generateId() }, ...prev]);
      return true;
    },
    [entries, confirmDuplicate]
  );

  const handleUpdateEntry = useCallback((id: string, field: keyof AnchorEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }, []);

  const handleDeleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleDeleteSelected = useCallback((ids: string[]) => {
    const idsSet = new Set(ids);
    setEntries((prev) => prev.filter((e) => !idsSet.has(e.id)));
  }, []);

  const handleExport = useCallback(() => {
    exportToExcel(entries);
  }, [entries]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');

  useEffect(() => {
    loadFromGoogleSheets()
      .then((data) => setEntries(data))
      .catch((err) => setLoadError(err?.message ?? 'שגיאה בטעינה מ־Sheets'))
      .finally(() => {
        hasLoadedRef.current = true;
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      setSyncStatus('syncing');
      syncToGoogleSheets(entries)
          .then(() => setSyncStatus('ok'))
          .catch(() => setSyncStatus('error'))
          .finally(() => {
            setTimeout(() => setSyncStatus('idle'), 2000);
          });
      syncTimeoutRef.current = null;
    }, 800);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [entries]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-slate-100">
      <header className="border-b border-amber-200/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">רשימת עוגן</h1>
              <p className="text-sm text-slate-500">
                הזנת מידע והמרה לרשימת לכודים באמצעות AI
              </p>
            </div>
            {(entries.length > 0 || syncStatus !== 'idle') && (
              <div className="flex items-center gap-3">
                {syncStatus !== 'idle' && (
                  <span
                    className={`text-sm ${
                      syncStatus === 'ok'
                        ? 'text-emerald-600'
                        : syncStatus === 'error'
                          ? 'text-red-600'
                          : 'text-slate-500'
                    }`}
                    role="status"
                  >
                    {syncStatus === 'syncing' && 'מסנכרן ל־Google Sheets…'}
                    {syncStatus === 'ok' && '✓ סונכרן'}
                    {syncStatus === 'error' && 'שגיאה בסנכרון'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleExport}
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700 transition-colors"
                >
                  ייצא לאקסל
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loadError && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm flex items-center justify-between gap-4 flex-wrap">
            <span>{loadError} – וודא ש־<code className="bg-red-100 px-1 rounded">npm run server</code> רץ (פורט 3001)</span>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setIsLoading(true);
                loadFromGoogleSheets()
                  .then((data) => setEntries(data))
                  .catch((err) => setLoadError(err?.message ?? 'שגיאה בטעינה'))
                  .finally(() => setIsLoading(false));
              }}
              className="rounded bg-red-200 px-3 py-1.5 text-sm font-medium hover:bg-red-300"
            >
              נסה שוב
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="py-16 text-center text-slate-500">טוען מ־Google Sheets…</div>
        ) : (
        <div className="space-y-8">
          <RawInputSection
            value={rawInput}
            onChange={setRawInput}
            onExtract={handleExtract}
            isLoading={isExtracting}
            error={extractError}
            progressMessage={extractProgress}
            progressPercent={extractProgressPercent}
          />

          <AddEntryForm onAdd={handleAddEntry} />

          {pendingDuplicate && (
            <DuplicateConfirmDialog
              existing={pendingDuplicate.existing}
              newEntry={pendingDuplicate.new}
              onSamePerson={() => duplicateResolveRef.current?.(false)}
              onDifferentPerson={() => duplicateResolveRef.current?.(true)}
            />
          )}

          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-800">הרשימה</h2>
            <AnchorListTable
              entries={entries}
              onUpdate={handleUpdateEntry}
              onDelete={handleDeleteEntry}
              onDeleteSelected={handleDeleteSelected}
            />
          </section>
        </div>
        )}
      </main>
    </div>
  );
}

export default App;
