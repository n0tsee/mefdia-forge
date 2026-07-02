# MediaForge

Оффлайн-приложение для пакетной обработки медиафайлов на базе FFmpeg. Без
командной строки, без облака — FFmpeg поставляется вместе с приложением.
Windows / macOS / Linux.

![dark](https://img.shields.io/badge/theme-dark-101114) ![offline](https://img.shields.io/badge/offline-100%25-22c55e)

---

## Стек и почему именно он

| Слой            | Технология                        | Причина выбора |
|-----------------|-----------------------------------|----------------|
| Оболочка        | **Tauri 2**                       | Нативный webview вместо встроенного Chromium (Electron) → бинарник ~10 МБ вместо ~150 МБ, потребление RAM в разы ниже. Критично для «высокой производительности». |
| Backend         | **Rust** (tokio)                  | Настоящая многопоточность без GIL/event-loop-боттлнеков, безопасная работа с процессами, надёжное управление дочерними процессами (kill для отмены). |
| Frontend        | **React 18 + TypeScript**         | Быстрая разработка сложного UI, строгая типизация контрактов с backend. |
| Стили           | **Tailwind CSS**                  | Дизайн-токены тёмной темы в одном месте, без «legacy Windows»-контролов. |
| Анимации        | **Framer Motion**                 | Плавные переходы карточек/панелей уровня Linear/Arc. |
| Состояние       | **Zustand**                       | Минимальный boilerplate, подписка на события от Rust. |
| FFmpeg          | **Sidecar-бинарник**              | Кладётся рядом с приложением и запускается как отдельный процесс — не линкуется, легко обновлять. |

**Tauri, а не Electron** — потому что приложение позиционируется как «высокая
производительность» и «полностью оффлайн»: нам не нужен встроенный браузер,
нужен лёгкий нативный webview + мощный системный слой на Rust для управления
десятками параллельных ffmpeg-процессов.

---

## Структура папок

```
mediaforge/
├── index.html
├── package.json
├── vite.config.ts / tailwind.config.js / tsconfig*.json
│
├── src/                         # FRONTEND (React)
│   ├── main.tsx  App.tsx
│   ├── api/
│   │   ├── types.ts             # TS-зеркало Rust-типов (serde-контракт)
│   │   └── tauri.ts             # invoke-обёртки команд + подписки на события
│   ├── store/                   # Zustand-стора
│   │   ├── useFilesStore.ts     # список файлов
│   │   ├── useQueueStore.ts     # очередь + прогресс + логи (слушает события Rust)
│   │   ├── useSettingsStore.ts  # настройки
│   │   └── useToastStore.ts     # уведомления «Готово» и ошибки
│   ├── lib/
│   │   ├── operations.ts        # метаданные карточек и форматов
│   │   └── queueHelpers.ts      # фильтрация файлов по типу + постановка в очередь
│   └── components/
│       ├── layout/AppShell.tsx  # шапка + двухколоночный layout + нижняя панель
│       ├── files/               # список файлов, drag&drop, элемент файла
│       ├── actions/             # карточки действий + панели опций (panels/)
│       ├── queue/               # BottomBar, ProgressBar, LogPanel
│       ├── settings/            # выезжающая панель настроек
│       └── common/              # Button, Card, Field, SegmentedControl, Toast
│
└── src-tauri/                   # BACKEND (Rust)
    ├── Cargo.toml  tauri.conf.json  build.rs
    ├── capabilities/default.json    # разрешения (в т.ч. на sidecar-запуск)
    ├── binaries/                    # СЮДА кладутся ffmpeg/ffprobe (см. binaries/README.md)
    └── src/
        ├── main.rs  lib.rs          # точка входа, регистрация плагинов, команд, state
        ├── state.rs                 # общий AppState (очередь, настройки, логгер)
        ├── ffmpeg/                  # === FFMPEG WRAPPER ===
        │   ├── binary.rs            #   поиск sidecar-бинарника
        │   ├── probe.rs             #   ffprobe → длительность/разрешение
        │   ├── progress.rs          #   парсер -progress → проценты
        │   └── runner.rs            #   запуск, стрим прогресса/лога, kill (отмена)
        ├── tasks/                   # === ЛОГИКА ОПЕРАЦИЙ ===
        │   ├── types.rs             #   enum Operation (15 операций) + метаданные
        │   ├── mod.rs               #   диспетчер: Operation → аргументы ffmpeg
        │   └── ops/                 #   по одному билдеру аргументов на операцию
        ├── queue/mod.rs             # === ОЧЕРЕДЬ ЗАДАЧ === (параллелизм, отмена, события)
        ├── settings/mod.rs          # === SETTINGS === (сохранение в app_config_dir)
        ├── logger/mod.rs            # === LOGGER === (файловый лог по дням)
        └── utils/mod.rs             # === UTILS === (построение пути вывода, уникализация)
```

Все семь модулей из ТЗ (Frontend, Backend, FFmpeg Wrapper, Task Queue,
Settings, Logger, Utils) выделены явно.

---

## Как UI взаимодействует с FFmpeg

```
┌────────────┐  invoke("queue_add")   ┌─────────────┐  build_args()  ┌──────────────┐
│  React UI  │ ─────────────────────► │  Commands   │ ─────────────► │ tasks::ops:: │
│ (Zustand)  │  invoke("queue_start") │  (Rust)     │                │  *  billder  │
└─────▲──────┘                        └──────┬──────┘                └──────┬───────┘
      │                                      │                              │ Vec<String>
      │  events:                             ▼                              ▼
      │  task-progress / task-status  ┌─────────────┐   spawn sidecar ┌──────────────┐
      │  task-log / queue-done        │ TaskQueue   │ ──────────────► │  ffmpeg.exe  │
      └───────────────────────────────┤ (semaphore) │ ◄── stdout/err ─┤  (процесс)   │
                                       └─────────────┘                 └──────────────┘
```

1. Пользователь выбирает файлы и жмёт карточку действия. UI **не собирает
   ffmpeg-команды** — он формирует типизированный объект `Operation` и отправляет
   `queue_add`.
2. `queue_start` запускает очередь. Для каждой задачи Rust вызывает `ffprobe`
   (длительность нужна для процента), затем `tasks::build_args` превращает
   `Operation` в массив аргументов, и `runner` запускает ffmpeg-sidecar.
3. Прогресс/логи/статусы летят обратно в UI через события Tauri; Zustand их
   агрегирует в общий прогресс и лог.

---

## Как запускается FFmpeg

FFmpeg подключён как **sidecar** (`externalBin` в `tauri.conf.json`). Tauri сам
выбирает нужный бинарник по target-triple платформы. Запуск:

```rust
// src-tauri/src/ffmpeg/runner.rs
let mut full_args = vec!["-y", "-hide_banner", "-loglevel", "error",
                         "-progress", "pipe:1", "-nostats"];
full_args.extend(operation_args);            // ← собрано программно в tasks::ops
let (mut rx, child) = ffmpeg_sidecar(app)?.args(full_args).spawn()?;
registry.lock().await.insert(task_id, child); // ← сохраняем для возможной отмены
```

Никаких .bat / .sh — **все параметры собираются в коде** (`src-tauri/src/tasks/ops/*`).

---

## Как получается прогресс

FFmpeg запускается с `-progress pipe:1`, который печатает машиночитаемые блоки:

```
out_time=00:00:05.500000
progress=continue
```

`ffmpeg/progress.rs` инкрементально парсит `out_time`, делит на общую
длительность (из `ffprobe`) и отдаёт процент. `runner.rs` эмитит событие
`task-progress`, а `queue` считает общий прогресс как среднее по задачам.

---

## Как реализована отмена

Каждый запущенный ffmpeg-процесс регистрируется в `ChildRegistry`
(`HashMap<TaskId, CommandChild>`).

- **Отмена одной задачи** → `child.kill()` по её id.
- **Кнопка «Остановить»** → `cancel_all`: kill всех процессов + пометка ещё не
  стартовавших задач как отменённых.

Множество `CancelledSet` позволяет отличить намеренную отмену (статус
`Cancelled`) от реальной ошибки ffmpeg (статус `Failed`).

---

## Как организована очередь задач

`queue/mod.rs` держит `Vec<QueueItem>` за `tokio::Mutex`. При старте:

```rust
let semaphore = Arc::new(Semaphore::new(settings.effective_threads()));
for id in queued_ids {
    let permit = semaphore.clone().acquire_owned().await; // ← ограничение параллелизма
    tokio::spawn(async move { queue.run_one(id).await; });
}
```

- Параллелизм = число задач, выполняемых одновременно (по умолчанию = число
  логических ядер, `num_cpus::get()`; настраивается в UI).
- Каждая задача сама многопоточна внутри ffmpeg — поэтому по умолчанию
  берём число ядер как разумный баланс.
- Порядок сохраняется, статусы: `Queued → Probing → Running → Completed/Failed/Cancelled`.

---

## 15 операций

| Карточка | Операция | Ключ ffmpeg |
|----------|----------|-------------|
| 🎵 Voice | `telegram_voice` | `-ac 1 -ar 48000 -b:a 16k -c:a libopus` |
| 🎥 Video Note | `telegram_video_note` | `crop→scale=512:512`, H264 baseline |
| 📦 Сжатие | `compress_video` | CRF 32/26/18 (сильное/среднее/без потерь) |
| 🎬 Видео | `convert_video` | mp4/mov/avi/mkv/webm/m4v |
| 🎧 Аудио | `convert_audio` | mp3/ogg/wav/aac/m4a/flac/opus |
| 🖼 Кадры | `extract_frames` | по интервалу / fps / один кадр |
| ⚙ Доп. | объединение · извлечение аудио · GIF · FPS · разрешение · обрезка · поворот · битрейт · скорость |

---

## Запуск для разработки

```bash
# 1. Положить ffmpeg/ffprobe в src-tauri/binaries/ (см. binaries/README.md)
#    Для текущей машины (aarch64-apple-darwin) команда уже описана там.

# 2. Зависимости
npm install

# 3. Dev-режим (запустит Vite + нативное окно)
npm run tauri dev

# 4. Сборка дистрибутива (.dmg / .msi / .AppImage)
npm run tauri build
```

## Статус проверки

- `cargo check` / `cargo test` — проходят (парсер прогресса покрыт тестами).
- `npm run build` (tsc + vite) — проходит.
- Все команды ffmpeg проверены на реальном встроенном бинарнике: voice →
  opus/48k/mono, video note → H264 Constrained Baseline 512×512, сжатие, GIF,
  изменение скорости — корректный вывод.

## Лицензия FFmpeg

Static-сборки с libx264 распространяются под GPL. При публичном распространении
приложения соблюдайте условия GPL (см. `src-tauri/binaries/README.md`).
