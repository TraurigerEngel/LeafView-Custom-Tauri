import { memo, useLayoutEffect, useRef } from "react";
import { imageSrc, fileName } from "./bridge";
import "./Grid.scss";
type Props = { current: string; files: string[]; onSelect: (path: string) => void; onClose: () => void; };
export const Grid = memo(({ current, files, onSelect, onClose }: Props) => {
  const selected = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => selected.current?.scrollIntoView({ block: "center" }), []);
  return <div className="grid-content" onClick={onClose}>
    <div className="thumb-container">{files.map(path =>
      <div className="wrapper" key={path} ref={path === current ? selected : null}>
        <img className={path === current ? "thumb current" : "thumb"}
          src={imageSrc(path)} loading="lazy" decoding="async" alt={fileName(path)} title={fileName(path)}
          onClick={e => {e.stopPropagation(); onSelect(path);}}
          onDragStart={e => e.preventDefault()}/>
      </div>
    )}</div>
  </div>;
});
Grid.displayName = "Grid";
