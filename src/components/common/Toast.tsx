import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

const iconByKind = {
  success: <CheckCircle2 size={18} className="text-success shrink-0" />,
  error: <XCircle size={18} className="text-danger shrink-0" />,
  info: <Info size={18} className="text-accent shrink-0" />,
};

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-24 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="pointer-events-auto flex w-80 items-start gap-2.5 rounded-xl border border-base-600 bg-base-800/95 p-3.5 shadow-card backdrop-blur"
          >
            {iconByKind[toast.kind]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-base-100">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 truncate text-xs text-base-300">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded p-0.5 text-base-400 hover:bg-base-700 hover:text-base-100"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
