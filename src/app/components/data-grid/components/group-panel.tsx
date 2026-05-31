import { Group, Layers3 } from "lucide-react";

import { Badge } from "../../ui/badge";
import { cn } from "../../ui/utils";
import type { DataGridColumn } from "../types";
import { getGridFieldTypeIcon } from "./grid-header-cell";
import { PanelShell } from "./panel-shell";

export function GroupPanel<T>({
    columns,
    activeGroupBy,
    onGroupChange,
}: {
    columns: Array<DataGridColumn<T>>;
    activeGroupBy: string | null;
    onGroupChange: (columnKey: string | null) => void;
}) {
    return (
        <PanelShell title="分组">
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => onGroupChange(null)}
                    className={cn(
                        "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors",
                        activeGroupBy === null ? "border-blue-200 bg-blue-50 text-blue-700" : "border-border/60 bg-background/35 hover:bg-background/55",
                    )}
                >
                    <div className="flex items-center gap-3">
                        <span className="inline-flex size-8 items-center justify-center rounded-xl border border-border/60 bg-background/60">
                            <Layers3 className="size-4" />
                        </span>
                        <div>
                            <div className="text-sm font-medium">不分组</div>
                        </div>
                    </div>
                    {activeGroupBy === null && <Badge variant="outline" className="rounded-full border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">当前</Badge>}
                </button>

                {columns.map((column) => {
                    const Icon = getGridFieldTypeIcon(column);
                    const selected = activeGroupBy === column.key;

                    return (
                        <button
                            key={column.key}
                            type="button"
                            onClick={() => onGroupChange(column.key)}
                            className={cn(
                                "flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors",
                                selected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border/60 bg-background/35 hover:bg-background/55",
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "inline-flex size-8 items-center justify-center rounded-xl border",
                                    selected ? "border-emerald-200 bg-white text-emerald-700" : "border-border/60 bg-background/60 text-muted-foreground",
                                )}>
                                    <Icon className="size-4" />
                                </span>
                                <div className="text-sm font-medium">{typeof column.title === "string" ? column.title : column.key}</div>
                            </div>
                            {selected ? <Group className="size-4" /> : null}
                        </button>
                    );
                })}
            </div>
        </PanelShell>
    );
}
