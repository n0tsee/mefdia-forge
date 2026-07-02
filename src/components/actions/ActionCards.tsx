import { ACTION_CARDS, type CardId } from "@/lib/operations";
import { ActionCard } from "./ActionCard";

export function ActionCards({ onSelect }: { onSelect: (id: CardId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ACTION_CARDS.map((card) => (
        <ActionCard key={card.id} card={card} onClick={() => onSelect(card.id)} />
      ))}
    </div>
  );
}
