import { ArrowLeft } from "lucide-react";

export function PanelHeader({
  emoji,
  title,
  subtitle,
  onBack,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <button
        onClick={onBack}
        className="rounded-lg p-1.5 text-base-400 hover:bg-base-800 hover:text-base-100"
        title="Назад"
      >
        <ArrowLeft size={16} />
      </button>
      <span className="text-xl leading-none">{emoji}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-base-100">{title}</h3>
        {subtitle && <p className="text-xs text-base-400">{subtitle}</p>}
      </div>
    </div>
  );
}
