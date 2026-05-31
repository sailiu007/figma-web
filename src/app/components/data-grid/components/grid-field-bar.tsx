import * as React from "react";

export function GridFieldBar({
    left,
    right,
}: {
    left?: React.ReactNode;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">{left}</div>
            <div className="flex flex-wrap items-center gap-1.5">{right}</div>
        </div>
    );
}
