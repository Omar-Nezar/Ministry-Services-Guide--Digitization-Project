/** Shared look of the controls on the ministry bar (appearance, accessibility, PDF export) */
export const barButtonClass =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-secondary-accent-foreground/20 bg-secondary-accent-foreground/[0.06] px-2.5 text-sm font-medium whitespace-nowrap text-secondary-accent-foreground outline-none transition-colors duration-200 hover:bg-secondary-accent-foreground/15 focus-visible:ring-2 focus-visible:ring-secondary-accent-foreground aria-expanded:bg-secondary-accent-foreground/15 disabled:opacity-70 md:px-3";

/** Shared look of the panels that open from the ministry bar */
export const barPanelMotion =
  "origin-top transition-[opacity,transform] duration-200 ease-brand data-starting-style:-translate-y-1 data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:-translate-y-1 data-ending-style:scale-[0.98] data-ending-style:opacity-0";
