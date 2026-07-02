import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-lg border border-base-600 bg-base-800 px-3 py-1.5 text-sm text-base-100 outline-none transition-colors focus:border-accent";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-base-300">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-base-500">{hint}</span>}
    </label>
  );
}
