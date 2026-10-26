use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
struct ActiveFolder(Mutex<Option<PathBuf>>);
#[derive(Default)]
struct PendingImage(Mutex<Option<String>>);

#[derive(Serialize)]
struct ImageSession { current: String, files: Vec<String> }

fn supported(path: &Path) -> bool {
    if !path.is_file() { return false; }
    let name = path.file_name().and_then(|x| x.to_str()).unwrap_or("");
    if name.starts_with('.') { return false; }
    matches!(path.extension().and_then(|x| x.to_str()).unwrap_or("").to_ascii_lowercase().as_str(),
        "bmp" | "ico" | "gif" | "jpg" | "jpeg" | "png" | "svg" | "webp")
}
fn full_path(path: &str) -> Result<PathBuf, String> {
    let input = Path::new(path);
    if !input.is_absolute() { return Err("Нужен абсолютный путь к изображению".into()); }
    let resolved = dunce::canonicalize(input).map_err(|e| e.to_string())?;
    if !supported(&resolved) { return Err("Неподдерживаемый или отсутствующий файл".into()); }
    Ok(resolved)
}
fn in_folder(folder: &Path) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(folder).map_err(|e| e.to_string())?;
    let mut files: Vec<PathBuf> = entries.filter_map(Result::ok)
        .filter_map(|entry| {
            // Skip symlinks to avoid following files outside the opened folder.
            if !entry.file_type().ok()?.is_file() { return None; }
            let path = entry.path();
            if supported(&path) { Some(path) } else { None }
        }).collect();
    files.sort_by(|a,b| {
        let a = a.file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
        let b = b.file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_default();
        natord::compare(&a.to_lowercase(), &b.to_lowercase())
    });
    Ok(files.into_iter().map(|p| p.to_string_lossy().into_owned()).collect())
}

#[tauri::command]
fn open_image(app: AppHandle, path: String, folder: State<'_, ActiveFolder>) -> Result<ImageSession, String> {
    let current = full_path(&path)?;
    let parent = current.parent().ok_or("Не удалось найти папку")?;
    let images = in_folder(parent)?;
    let current_text = current.to_string_lossy().into_owned();
    if !images.iter().any(|p| p == &current_text) { return Err("Файл недоступен".into()); }
    // Runtime asset scope is limited to the chosen directory (non-recursive).
    app.asset_protocol_scope().allow_directory(parent, false).map_err(|e| e.to_string())?;
    *folder.0.lock().map_err(|e| e.to_string())? = Some(parent.to_path_buf());
    Ok(ImageSession { current: current_text, files: images })
}

#[tauri::command]
fn initial_image(pending: State<'_, PendingImage>) -> Option<String> {
    pending.0.lock().ok().and_then(|value| value.clone())
}

#[tauri::command]
fn refresh_images(folder: State<'_, ActiveFolder>) -> Result<Vec<String>, String> {
    let selected = folder.0.lock().map_err(|e| e.to_string())?.clone();
    match selected { Some(parent) => in_folder(&parent), None => Ok(Vec::new()) }
}

#[tauri::command]
fn trash_image(path: String, folder: State<'_, ActiveFolder>) -> Result<bool, String> {
    let canonical = full_path(&path)?;
    let allowed = folder.0.lock().map_err(|e| e.to_string())?.clone();
    let parent = allowed.ok_or("Папка не открыта")?;
    if canonical.parent() != Some(parent.as_path()) {
        return Err("Удаление разрешено только в открытой папке".into());
    }
    // The confirmation is displayed in the frontend; this command never permanently deletes.
    trash::delete(canonical).map_err(|e| e.to_string())?;
    Ok(true)
}

fn command_line_image(args: impl Iterator<Item = String>) -> Option<String> {
    args.skip(1).find_map(|arg| {
        let path = Path::new(&arg);
        if supported(path) { dunce::canonicalize(path).ok().map(|p| p.to_string_lossy().into_owned()) }
        else { None }
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = command_line_image(argv.into_iter()) {
                if let Ok(mut pending) = app.state::<PendingImage>().0.lock() {
                    *pending = Some(path.clone());
                }
                let _ = app.emit("file-open-requested", path);
            }
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .manage(ActiveFolder::default())
        .manage(PendingImage::default())
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            if let Some(path) = command_line_image(args.into_iter()) {
                if let Ok(mut pending) = app.state::<PendingImage>().0.lock() {
                    *pending = Some(path);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_image, initial_image, refresh_images, trash_image])
        .run(tauri::generate_context!())
        .expect("Failed to launch LeafView Custom Tauri");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn supported_extensions() {
        let dir = std::env::temp_dir();
        let p = dir.join(format!("leafview-test-{}.PNG", std::process::id()));
        fs::write(&p, b"fake image for extension test").unwrap();
        assert!(supported(&p));
        fs::remove_file(&p).unwrap();
        assert!(!supported(&p));
    }
    #[test]
    fn reject_relative_path() { assert!(full_path("..\\secret.jpg").is_err()); }
}
