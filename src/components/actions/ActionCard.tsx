import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ActionCardMeta } from "@/lib/operations";

export function ActionCard({
  card,
  onClick,
}: {
  card: ActionCardMeta;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-xl2 border border-base-700 bg-base-850 p-4 text-left shadow-card transition-colors hover:border-accent/60 hover:bg-base-800"
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-2xl leading-none">{card.emoji}</span>
        <ChevronRight
          size={16}
          className="text-base-500 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-base-100">{card.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-base-400">{card.subtitle}</p>
      </div>
    </motion.button>
  );
}
