import { convertFileSrc, invoke } from "@tauri-apps/api/core";
export type ImageSession = { current: string; files: string[] };
export const imageSrc = (path: string) => convertFileSrc(path);
export const openImage = (path: string): Promise<ImageSession> => invoke("open_image", { path });
export const refreshImages = (): Promise<string[]> => invoke("refresh_images");
export const initialImage = (): Promise<string | null> => invoke("initial_image");
export const moveToTrash = (path: string): Promise<boolean> => invoke("trash_image", { path });
export const fileName = (path: string) => path.split(/[\\/]/).pop() || path;
// We only read the directory's flat, supported-image listing, never the whole disk.
