import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ask, message, open } from "@tauri-apps/plugin-dialog";
import i18next from "i18next";
import { Grid } from "./Grid";
import { ToolBar } from "./ToolBar";
import { View } from "./View";
import { fileName, initialImage, moveToTrash, openImage, refreshImages } from "./bridge";
import "./App.scss";

export const App = () => {
  const [path, setPath] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [grid, setGrid] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [error, setError] = useState("");
  const [context, setContext] = useState<{x:number;y:number} | null>(null);
  const pathRef = useRef("");
  const filesRef = useRef<string[]>([]);
  const openedSeq = useRef(0);
  const deleting = useRef(false);

  const apply = useCallback((value: string, items: string[]) => {
    pathRef.current = value; filesRef.current = items;
    setPath(value); setFiles(items); setGrid(false); setError("");
  }, []);

  const showImage = useCallback(async (raw: string) => {
    const seq = ++openedSeq.current;
    try {
      const session = await openImage(raw);
      if (seq === openedSeq.current) apply(session.current, session.files);
    } catch (e) {
      if (seq === openedSeq.current) setError(`Не удалось открыть файл: ${String(e)}`);
    }
  }, [apply]);

  useEffect(() => {
    let alive = true;
    let offOpen: (() => void) | undefined;
    let offDrop: (() => void) | undefined;
    // Register listeners BEFORE retrieving the startup path, so a second instance
    // cannot lose an image while the React UI is initializing.
    void (async () => {
      const unlistenOpen = await listen<string>("file-open-requested", e => void showImage(e.payload));
      if (!alive) { unlistenOpen(); return; }
      offOpen = unlistenOpen;
      const unlistenDrop = await getCurrentWebview().onDragDropEvent(e => {
        if (e.payload.type === "drop" && e.payload.paths.length) void showImage(e.payload.paths[0]);
      });
      if (!alive) { unlistenDrop(); return; }
      offDrop = unlistenDrop;
      const initial = await initialImage();
      if (alive && initial) await showImage(initial);
    })().catch(e => { if (alive) setError(`Ошибка инициализации: ${String(e)}`); });
    return () => { alive = false; offOpen?.(); offDrop?.(); };
  }, [showImage]);

  // Reveal the toolbar on approach to the bottom 64px (instead of 16px).
  // Keep it visible within the bottom 128px so the cursor can reach every
  // button without making the panel flicker. Observe pointer moves globally so
  // Leaflet's pan/drag event handling cannot accidentally suppress them.
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      const distance = window.innerHeight - event.clientY;
      setToolbarVisible(wasVisible => distance >= 0 &&
        (distance <= 64 || (wasVisible && distance <= 128)));
    };
    const hide = () => setToolbarVisible(false);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", hide);
    window.addEventListener("pointerleave", hide);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", hide);
      window.removeEventListener("pointerleave", hide);
    };
  }, []);

  // Put filename and folder position in the native Windows title bar, not over
  // the image. Update both on image changes and on refreshed folder contents.
  useEffect(() => {
    const index = files.indexOf(path);
    const position = index >= 0 ? `  (${index + 1}/${files.length})` : "";
    const title = path
      ? `${fileName(path)}${position} — LeafView Custom`
      : "LeafView Custom — Tauri Edition";
    void getCurrentWindow().setTitle(title).catch(console.error);
  }, [path, files]);

  const change = useCallback((shift: number) => {
    const current = pathRef.current;
    const list = filesRef.current;
    if (!current || list.length < 2) return;
    const currentIndex = list.indexOf(current);
    // Stop at the first/last file: navigation must not wrap to the other end.
    if (currentIndex < 0) return;
    const target = currentIndex + shift;
    if (target < 0 || target >= list.length) return;
    // Same directory: already validated/scope-granted by Rust. No re-scan needed.
    pathRef.current = list[target];
    setPath(list[target]);
    setGrid(false);
    setError("");
  }, []);
  const prev = useCallback(async () => change(-1), [change]);
  const next = useCallback(async () => change(1), [change]);

  const doOpen = useCallback(async () => {
    try {
      const selected = await open({ multiple: false, directory: false, title: "Открыть изображение", filters: [
        { name: "Изображения", extensions: ["bmp", "ico", "gif", "jpg", "jpeg", "png", "svg", "webp"] },
      ] });
      if (typeof selected === "string") await showImage(selected);
    } catch (e) { setError(`Не удалось выбрать файл: ${String(e)}`); }
  }, [showImage]);

  const doDelete = useCallback(async () => {
    const current = pathRef.current;
    if (!current || deleting.current) return;
    deleting.current = true;
    try {
      const yes = await ask(`Переместить «${fileName(current)}» в корзину?`, {
        title: "Удаление изображения", kind: "warning", okLabel: "В корзину", cancelLabel: "Отмена",
      });
      if (!yes) return;
      const removed = await moveToTrash(current);
      if (!removed) return;
      const oldList = filesRef.current;
      const oldIndex = oldList.indexOf(current);
      const updated = await refreshImages();
      // Opening another folder while the confirmation is up must not overwrite its state.
      if (current !== pathRef.current) return;
      const index = Math.min(Math.max(0, oldIndex), updated.length - 1);
      apply(updated.length ? updated[index] : "", updated);
    } catch (e) {
      const description = `Не удалось удалить изображение: ${String(e)}`;
      setError(description);
      void message(description, { title: "LeafView Custom", kind: "error" });
    } finally { deleting.current = false; }
  }, [apply]);

  const toggleGrid = useCallback(async () => { if (pathRef.current) setGrid(v => !v); }, []);
  const selectThumb = useCallback((item: string) => {
    if (!filesRef.current.includes(item)) return;
    pathRef.current = item; setPath(item); setGrid(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const node = e.target as HTMLElement | null;
      // Esc always closes the application, even when the grid or menu is open.
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation();
        if (!e.repeat) void getCurrentWindow().close().catch(console.error);
        return;
      }
      if (e.altKey || e.metaKey || node?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (e.ctrlKey) {
        if (["o", "O", "щ", "Щ"].includes(e.key)) { e.preventDefault(); void doOpen(); }
        else if (["ArrowRight", "n", "N"].includes(e.key)) { e.preventDefault(); change(1); }
        else if (["ArrowLeft", "p", "P"].includes(e.key)) { e.preventDefault(); change(-1); }
        else if (["g", "G", "п", "П"].includes(e.key)) { e.preventDefault(); void toggleGrid(); }
        return;
      }
      if (e.key === "F11") {
        e.preventDefault();
        const win = getCurrentWindow();
        void win.isFullscreen().then(value => win.setFullscreen(!value)).catch(console.error);
        return;
      }
      if (["j", "J"].includes(e.key)) { e.preventDefault(); change(1); return; }
      if (["k", "K"].includes(e.key)) { e.preventDefault(); change(-1); return; }
      if (["h", "H"].includes(e.key)) { e.preventDefault(); void toggleGrid(); return; }
      if (["ArrowLeft", "ArrowRight", "PageUp", "PageDown"].includes(e.key)) {
        if (!pathRef.current) return;
        e.preventDefault(); e.stopPropagation();
        change(e.key === "ArrowLeft" || e.key === "PageUp" ? -1 : 1);
      } else if (e.key === "Delete" && pathRef.current) {
        e.preventDefault(); e.stopPropagation(); void doDelete();
      }
    };
    // Capture before Leaflet receives arrows and moves the viewport.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [change, doDelete, doOpen, toggleGrid]);

  const currentIndex = files.indexOf(path);
  const canPrev = currentIndex > 0;
  const canNext = currentIndex >= 0 && currentIndex < files.length - 1;

  return <div className={grid ? "container grid" : "container"}
    onClick={() => setContext(null)}
    onContextMenu={e => {e.preventDefault(); setContext({x: Math.min(e.clientX, window.innerWidth - 210), y: Math.min(e.clientY, window.innerHeight - 245)});}}>
    {grid ? <Grid current={path} files={files} onSelect={selectThumb} onClose={() => setGrid(false)}/> : <>
      {!path && <div className="empty-state"><div className="empty-state-symbol">✦</div>
        <div className="empty-state-label">{i18next.t("Drop an image here")}</div>
        <button className="empty-open" onClick={doOpen}>{i18next.t("Open...")}</button></div>}
      <View path={path}/>
      <ToolBar visible={toolbarVisible} hasImage={Boolean(path)} canPrev={canPrev} canNext={canNext} onPrev={prev} onNext={next} onRemove={doDelete} onClickOpen={doOpen} onToggleGrid={toggleGrid}/>
    </>}
    {context && <div className="context-menu" style={{left: Math.max(8, context.x), top: Math.max(8, context.y)}}
      onClick={e => e.stopPropagation()} role="menu" aria-label="Действия с изображением">
      <button onClick={() => {setContext(null);void doOpen();}}>Открыть… <span>Ctrl+O</span></button>
      <button disabled={!canPrev} onClick={() => {setContext(null);void prev();}}>Предыдущее <span>←</span></button>
      <button disabled={!canNext} onClick={() => {setContext(null);void next();}}>Следующее <span>→</span></button>
      <button disabled={!path} onClick={() => {setContext(null);void toggleGrid();}}>Миниатюры <span>H</span></button>
      <div className="context-separator"/>
      <button disabled={!path} onClick={() => {setContext(null);void doDelete();}}>Переместить в корзину <span>Del</span></button>
    </div>}
    {error && <div className="error-toast" role="alert" onClick={() => setError("")}>{error} <span>×</span></div>}
  </div>;
};
