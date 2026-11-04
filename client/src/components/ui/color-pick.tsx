import { useEffect, useRef, useState, type ComponentProps } from "react";

/**
 * A colour input that reports only the finished choice. While the picker is being dragged only this
 * swatch re-renders; `onCommit` runs shortly after the last change, or when the picker loses focus.
 *
 * It uses React's own handlers (not listeners on a ref) so it keeps working when a wrapper such as a
 * tooltip trigger passes it props and takes over its ref.
 */
export function ColorPick({
  value,
  onCommit,
  className,
  onChange,
  onBlur,
  ...rest
}: Omit<ComponentProps<"input">, "value" | "type"> & {
  value: string;
  onCommit: (color: string) => void;
}) {
  const [live, setLive] = useState(value);
  const commit = useRef(onCommit);
  commit.current = onCommit;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<string | null>(null);

  useEffect(() => setLive(value), [value]);

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    const color = pending.current;
    pending.current = null;
    commit.current(color);
  };

  // Don't lose a choice if the swatch disappears before the timer fires
  useEffect(() => flush, []);

  return (
    <input
      {...rest}
      type="color"
      value={live}
      className={className}
      onChange={(e) => {
        const color = e.target.value;
        setLive(color);
        pending.current = color;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, 400);
        onChange?.(e);
      }}
      onBlur={(e) => {
        flush();
        onBlur?.(e);
      }}
    />
  );
}
