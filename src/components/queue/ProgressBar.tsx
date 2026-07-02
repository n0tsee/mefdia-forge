export function ProgressBar({
  percent,
  tone = "accent",
}: {
  percent: number;
  tone?: "accent" | "success" | "danger";
}) {
  const toneClass =
    tone === "success" ? "bg-success" : tone === "danger" ? "bg-danger" : "bg-accent";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-base-700">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ease-out ${toneClass}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
