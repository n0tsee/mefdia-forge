import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, X } from "lucide-react";
import { api } from "@/api/tauri";
import { Button } from "@/components/common/Button";
import { Field, inputClass } from "@/components/common/Field";
import { useSettingsStore } from "@/store/useSettingsStore";

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-base-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}

export function SettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  async function handleChooseFolder() {
    const folder = await api.pickOutputFolder();
    if (folder) {
      await update({ saveMode: "choose_folder", customOutputDir: folder });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col border-l border-base-700 bg-base-900 p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-base-100">Настройки</h2>
              <button onClick={onClose} className="rounded p-1 text-base-400 hover:bg-base-800">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto">
              <section className="flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-base-500">
                  Папка сохранения
                </h3>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-base-200">
                  <input
                    type="radio"
                    checked={settings.saveMode === "next_to_original"}
                    onChange={() => update({ saveMode: "next_to_original" })}
                    className="h-4 w-4 accent-accent"
                  />
                  Рядом с оригиналом
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-base-200">
                  <input
                    type="radio"
                    checked={settings.saveMode === "choose_folder"}
                    onChange={handleChooseFolder}
                    className="h-4 w-4 accent-accent"
                  />
                  Выбрать папку
                </label>
                {settings.saveMode === "choose_folder" && (
                  <Button size="sm" variant="secondary" onClick={handleChooseFolder} className="ml-6 w-fit">
                    <FolderOpen size={13} />
                    {settings.customOutputDir ?? "Выбрать..."}
                  </Button>
                )}
                <div className="mt-1">
                  <Checkbox
                    label="Создавать подпапку Output"
                    checked={settings.useOutputSubfolder}
                    onChange={(v) => update({ useOutputSubfolder: v })}
                  />
                </div>
              </section>

              <section className="flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-base-500">
                  После завершения
                </h3>
                <Checkbox
                  label="Открыть папку"
                  checked={settings.openFolderWhenDone}
                  onChange={(v) => update({ openFolderWhenDone: v })}
                />
                <Checkbox
                  label="Издать звук"
                  checked={settings.playSoundWhenDone}
                  onChange={(v) => update({ playSoundWhenDone: v })}
                />
                <Checkbox
                  label="Закрыть приложение"
                  checked={settings.closeAppWhenDone}
                  onChange={(v) => update({ closeAppWhenDone: v })}
                />
              </section>

              <section className="flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-base-500">
                  Производительность
                </h3>
                <Checkbox
                  label="Аппаратное ускорение (быстрее)"
                  checked={settings.hardwareAccel}
                  onChange={(v) => update({ hardwareAccel: v })}
                />
                <p className="-mt-1 text-[11px] text-base-500">
                  Кодирование видео на GPU (VideoToolbox). Значительно быстрее. Выключите, если
                  нужна максимально точная настройка качества.
                </p>
                <Field label="Параллельных задач" hint="Пусто = автоматически (по числу ядер)">
                  <input
                    type="number"
                    min={1}
                    max={32}
                    className={inputClass}
                    value={settings.threadCount ?? ""}
                    placeholder="Авто"
                    onChange={(e) =>
                      update({
                        threadCount: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
