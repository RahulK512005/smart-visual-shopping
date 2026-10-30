"use client";

export interface ChipOption { value: string; label?: string; count?: number }

/**
 * Toggle chips. Click a chip to select it, click again to deselect.
 * "All" is selected when nothing else is. `multi` allows several at once.
 */
export function FilterChips({ options, selected, onChange, multi = false, allLabel = "All", label }: {
  options: ChipOption[]; selected: string[]; onChange: (next: string[]) => void; multi?: boolean; allLabel?: string; label: string;
}) {
  function toggle(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v));
    else onChange(multi ? [...selected, v] : [v]);
  }

  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <button
        type="button"
        className="chip"
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
      >
        {allLabel}
      </button>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button key={o.value} type="button" className="chip" aria-pressed={on} onClick={() => toggle(o.value)}>
            {on && <span aria-hidden className="text-neon">✓</span>}
            {o.label ?? o.value}
            {o.count !== undefined && (
              <span
                className="text-xs"
                style={{ color: on ? "#06FFA5" : "rgba(255,255,255,.3)" }}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          className="btn-ghost min-h-0 shrink-0 px-3 py-2 text-xs"
          onClick={() => onChange([])}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
