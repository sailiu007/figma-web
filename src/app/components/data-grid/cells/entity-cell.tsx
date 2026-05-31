import * as React from "react";

export function GridEntityCell({
  title,
  description,
  accent,
  leading,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  accent?: string;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {leading ?? (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-md"
          style={{ background: accent ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : undefined }}
        >
          {String(title).slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-semibold">{title}</div>
        {description && <div className="text-muted-foreground truncate text-xs">{description}</div>}
      </div>
    </div>
  );
}
