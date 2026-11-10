import { useEffect, useRef } from "react";

function motionReduced() {
  return (
    document.documentElement.dataset.reduceMotion === "on" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * A number that counts up to `value` when it first appears. It writes straight to the DOM (no re-renders) and
 * shows the final value at once when motion is reduced. Screen readers only get the final value.
 */
export function CountUp({ value, className, duration = 900 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (motionReduced()) {
      el.textContent = String(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = String(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
