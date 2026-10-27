import L from "leaflet";
import { memo, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "./View.scss";
import { imageSrc } from "./bridge";

type Props = { path: string };
type Displayed = { image: HTMLImageElement; layer: L.ImageOverlay };

const fitScale = (iw: number, ih: number, w: number, h: number) =>
  Math.min(1, w / iw, h / ih);

export const View = memo(({ path }: Props) => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const displayed = useRef<Displayed | null>(null);
  const generation = useRef(0);

  const boundsFor = (image: HTMLImageElement, node: HTMLElement): L.LatLngBounds => {
    const scale = fitScale(image.naturalWidth, image.naturalHeight, node.clientWidth, node.clientHeight);
    // Center every image around the same fixed CRS origin. A different aspect
    // ratio must not force Leaflet to move the viewport while changing files.
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    return L.latLngBounds(
      [-height / 2, -width / 2],
      [height / 2, width / 2]
    );
  };

  const fitImage = (instance: L.Map, image: HTMLImageElement, node: HTMLElement) => {
    if (!node.clientWidth || !node.clientHeight) return;
    const bounds = boundsFor(image, node);
    // Scale is already baked into the symmetric image bounds. Keep the camera
    // at the fixed origin (zoom 0 = 1 image pixel per map pixel). Do not call
    // fitBounds: it zooms/centers after the next overlay has become visible.
    instance.setView([0, 0], 0, { animate: false });
    instance.setMaxBounds(bounds);
  };

  // Create the Leaflet map once, not every time a file changes. Destroying and
  // recreating the canvas/DOM was the cause of the full-window flashing.
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const instance = L.map(node, {
      crs: L.CRS.Simple, preferCanvas: true,
      zoomControl: false, attributionControl: false, doubleClickZoom: false,
      keyboard: false, zoomSnap: 0.3, zoomDelta: 0.3, wheelPxPerZoomLevel: 360,
      // Image changes must be immediate: no Leaflet zoom-slide or image fade.
      // Keep image pre-decoding and the existing map instance unchanged.
      zoomAnimation: false, fadeAnimation: false,
    }).setView([0, 0], 0, { animate: false });
    map.current = instance;
    instance.on("dblclick", () => {
      const current = displayed.current;
      if (current) fitImage(instance, current.image, node);
    });
    const observer = new ResizeObserver(() => {
      instance.invalidateSize({ pan: false, animate: false });
      const current = displayed.current;
      if (current) {
        current.layer.setBounds(boundsFor(current.image, node));
        fitImage(instance, current.image, node);
      }
    });
    observer.observe(node);
    return () => {
      ++generation.current;
      observer.disconnect();
      instance.off();
      instance.remove();
      displayed.current = null;
      map.current = null;
    };
  }, []);

  // Decode the next image *before* replacing the visible one. This keeps the
  // old image on screen while reading the next file from disk (also on trash).
  useEffect(() => {
    const node = container.current;
    const instance = map.current;
    if (!node || !instance) return;
    const token = ++generation.current;
    if (!path) {
      displayed.current?.layer.remove();
      displayed.current = null;
      delete node.dataset.error;
      return;
    }
    let cancelled = false;
    const requested = new Image();
    requested.onload = () => {
      void (async () => {
        try { await requested.decode(); } catch { /* onload already confirmed the file loaded */ }
        if (cancelled || token !== generation.current || !map.current) return;
        if (!requested.naturalWidth || !requested.naturalHeight) return;
        const bounds = boundsFor(requested, node);
        // Leaflet 1.9 accepts an <img> element at runtime, even though the
        // DefinitelyTyped imageOverlay signature still declares a string URL.
        // Reusing the decoded element prevents a second fetch and white flash.
        const layer = L.imageOverlay(requested as unknown as string, bounds);
        const old = displayed.current;
        // Prepare the camera BEFORE inserting the new decoded image into the
        // map. The entire swap occurs in one synchronous render opportunity.
        // Neither image is ever shown at the previous image’s offset.
        fitImage(instance, requested, node);
        layer.addTo(instance);
        displayed.current = { image: requested, layer };
        old?.layer.remove();
        delete node.dataset.error;
      })();
    };
    requested.onerror = () => {
      if (!cancelled && token === generation.current) {
        node.dataset.error = "Изображение не удалось загрузить";
      }
    };
    delete node.dataset.error;
    requested.src = imageSrc(path);
    return () => {
      cancelled = true;
      requested.onload = null;
      requested.onerror = null;
      // Keep the displayed Leaflet layer intact until the replacement is decoded.
    };
  }, [path]);

  return <div className={path ? "view" : "view init"} ref={container}
    role="img" aria-label={path || "Просмотр изображений"}/>;
});
View.displayName = "View";
