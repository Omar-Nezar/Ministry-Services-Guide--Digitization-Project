import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARABIC_MONTHS } from "@/lib/guide-api";
import { cn } from "@/lib/utils";

/** Picks a month and a year from a small calendar panel. `value` and `onChange` use "YYYY-MM". */
export function MonthPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  const selectedYear = m ? Number(m[1]) : null;
  const selectedMonth = m ? Number(m[2]) - 1 : null;
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(selectedYear ?? now.getFullYear());

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setYear(selectedYear ?? now.getFullYear());
      }}
    >
      <Popover.Trigger render={<Button type="button" variant="outline" size="sm" aria-label={label} />}>
        <CalendarDays />
        {selectedMonth === null ? label : `${ARABIC_MONTHS[selectedMonth]} ${selectedYear}`}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="w-64 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg outline-none">
            <div className="mb-2 flex items-center justify-between">
              {/* In a right-to-left page "next" points left */}
              <Button type="button" variant="ghost" size="icon" aria-label="Next year" onClick={() => setYear((y) => y + 1)}>
                <ChevronRight className="rtl:hidden" />
                <ChevronLeft className="hidden rtl:block" />
              </Button>
              <span className="font-medium tabular-nums">{year}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
                <ChevronLeft className="rtl:hidden" />
                <ChevronRight className="hidden rtl:block" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {ARABIC_MONTHS.map((name, i) => {
                const active = i === selectedMonth && year === selectedYear;
                return (
                  <button
                    key={name}
                    type="button"
                    className={cn(
                      "h-9 rounded-md text-sm transition-colors hover:bg-accent",
                      active && "bg-primary text-primary-foreground hover:bg-primary",
                      !active && i === now.getMonth() && year === now.getFullYear() && "border",
                    )}
                    onClick={() => {
                      onChange(`${year}-${String(i + 1).padStart(2, "0")}`);
                      setOpen(false);
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
