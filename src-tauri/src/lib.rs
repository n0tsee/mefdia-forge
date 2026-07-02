mod commands;
mod ffmpeg;
mod logger;
mod queue;
mod settings;
mod state;
mod tasks;
mod utils;

use tauri::Manager;
use tokio::sync::Mutex;

use logger::Logger;
use queue::TaskQueue;
use settings::Settings;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let logger = Logger::new(&handle);
            let settings = Settings::load(&handle);
            let queue = TaskQueue::new(handle.clone(), logger.clone());

            app.manage(AppState {
                queue,
                settings: Mutex::new(settings),
                logger,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::queue_add,
            commands::queue_start,
            commands::queue_stop,
            commands::queue_cancel_task,
            commands::queue_snapshot,
            commands::queue_clear_finished,
            commands::queue_is_running,
            commands::get_settings,
            commands::save_settings,
            commands::probe_file,
            commands::pick_output_folder,
            commands::reveal_path,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MediaForge");
}
