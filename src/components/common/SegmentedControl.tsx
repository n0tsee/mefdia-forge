export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "border-accent bg-accent/15 text-accent"
              : "border-base-600 bg-base-800 text-base-300 hover:border-base-500"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
