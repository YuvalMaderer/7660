import { useState, useRef, useEffect } from 'react';

interface RawInputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onExtract: () => void;
  isLoading?: boolean;
  error?: string | null;
  progressMessage?: string | null;
  progressPercent?: number | null;
}

const SpeechReco = typeof window !== 'undefined'
  ? (typeof SpeechRecognition !== 'undefined' ? SpeechRecognition : typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : null)
  : null;

export function RawInputSection({ value, onChange, onExtract, isLoading, error, progressMessage, progressPercent }: RawInputSectionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const startRecording = () => {
    if (!SpeechReco) {
      setRecordingError('הדפדפן שלך לא תומך בהקלטת קול. נסה Chrome.');
      return;
    }
    setRecordingError(null);
    transcriptRef.current = '';
    const recognition = new SpeechReco();
    recognition.lang = 'he-IL';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const full = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (full) transcriptRef.current = full;
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'aborted') setRecordingError(`שגיאה: ${e.error}`);
      setIsRecording(false);
    };
    recognition.onend = () => {
      if (transcriptRef.current) {
        const prev = valueRef.current;
        onChange(prev ? `${prev}\n${transcriptRef.current}` : transcriptRef.current);
      }
      setIsRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-slate-800">הזן מידע לעיבוד</h3>
      <p className="mb-4 text-sm text-slate-500">
        הדבק או הקלד מידע חופשי (הודעות, דיווחים, רשימות) – המערכת תמיר אוטומטית לרשימת עוגן.
      </p>
      {recordingError && (
        <p className="mb-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{recordingError}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="דוגמה: דירה 5 קומה 3 - משפחת כהן, יוסי, 123456789, טלפון 050-1234567, לכוד"
        rows={5}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
      />
      {error && (
        <div className="mt-2 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <p>{error}</p>
          <p className="text-amber-600">Ollama לא פעיל – ניתן להמשיך הזנה ידנית</p>
        </div>
      )}
      {isLoading && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: progressPercent != null ? `${Math.min(100, progressPercent)}%` : '30%' }}
            />
          </div>
          <p className="text-sm text-slate-500">
            {progressMessage || 'מעבד עם AI – בערך 20–60 שניות'}
          </p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExtract}
          disabled={isLoading || !value.trim()}
          className="rounded-lg bg-amber-500 px-5 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'מעבד...' : 'המר לרשימת עוגן'}
        </button>
        {SpeechReco ? (
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2.5 font-medium transition-colors flex items-center gap-2 ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'עצור הקלטה' : 'הקלט הודעה'}
          >
            <span className={`w-3 h-3 rounded-full bg-current ${isRecording ? 'animate-pulse' : ''}`} />
            {isRecording ? 'מקליט... לחץ לעצירה' : 'הקלט הודעה'}
          </button>
        ) : (
          <span className="text-sm text-slate-400">(הקלטת קול: Chrome בלבד)</span>
        )}
      </div>
    </div>
  );
}
