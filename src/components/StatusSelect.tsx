import { STATUS_OPTIONS } from '../types/anchorList';
import type { AnchorStatus } from '../types/anchorList';

interface StatusSelectProps {
  value: AnchorStatus;
  onChange: (value: AnchorStatus) => void;
  className?: string;
  id?: string;
}

export function StatusSelect({ value, onChange, className = '', id }: StatusSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as AnchorStatus)}
      className={`w-full min-w-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 ${className}`}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
