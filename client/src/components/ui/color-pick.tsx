import { useEffect, useRef, useState } from "react";

/**
 * A colour input that reports only the finished choice. While the picker is being dragged only this
 * swatch re-renders; `onCommit` runs once, when the picker is closed (the native `change` event).
 */
export function ColorPick({
  value,
  onCommit,
  className,
  ...rest
}: {
  value: string;
  onCommit: (color: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [live, setLive] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const commit = useRef(onCommit);
  commit.current = onCommit;

  useEffect(() => setLive(value), [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const done = () => commit.current(el.value);
    el.addEventListener("change", done);
    return () => el.removeEventListener("change", done);
  }, []);

  return (
    <input
      ref={ref}
      type="color"
      value={live}
      onChange={(e) => setLive(e.target.value)}
      className={className}
      {...rest}
    />
  );
}
