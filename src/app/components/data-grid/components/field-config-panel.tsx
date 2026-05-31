import * as React from "react";

import { Eye, EyeOff, GripVertical, Lock, Search } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { Input } from "../../ui/input";
import { cn } from "../../ui/utils";
import type { DataGridColumn } from "../types";
import { getGridFieldTypeIcon } from "./grid-header-cell";
import { PanelShell } from "./panel-shell";

const FIELD_ITEM_TYPE = "data-grid-field";

function SortableFieldItem<T>({
    column,
    visible,
    isPrimary,
    isGrouped,
    onToggleColumn,
    onColumnMove,
}: {
    column: DataGridColumn<T>;
    visible: boolean;
    isPrimary: boolean;
    isGrouped: boolean;
    onToggleColumn: (columnKey: string) => void;
    onColumnMove: (draggedColumnKey: string, targetColumnKey: string) => void;
}) {
    const Icon = getGridFieldTypeIcon(column);
    const rowRef = React.useRef<HTMLDivElement | null>(null);
    const handleRef = React.useRef<HTMLDivElement | null>(null);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: FIELD_ITEM_TYPE,
        item: { key: column.key },
        canDrag: visible,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [column.key, visible]);

    const [, drop] = useDrop(() => ({
        accept: FIELD_ITEM_TYPE,
        canDrop: () => visible,
        drop: (item: { key: string }) => {
            if (item.key !== column.key) {
                onColumnMove(item.key, column.key);
            }
        },
    }), [column.key, onColumnMove, visible]);

    drag(handleRef);
    drop(rowRef);

    return (
        <div
            ref={rowRef}
            className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition-colors",
                visible ? "border-border/60 bg-background/35" : "border-dashed border-border/50 bg-background/15 opacity-80",
                isDragging && "opacity-50",
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <div
                    ref={handleRef}
                    className={cn(
                        "flex items-center justify-center text-muted-foreground",
                        visible ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-40",
                    )}
                >
                    <GripVertical className="size-4" />
                </div>
                <span className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-xl border text-muted-foreground",
                    isPrimary ? "border-blue-200 bg-blue-50 text-blue-700" : "border-border/60 bg-background/60",
                )}>
                    <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{typeof column.title === "string" ? column.title : column.key}</div>
                    {isGrouped && <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">分组中</div>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isPrimary && <Lock className="size-3.5 text-muted-foreground" />}
                <button
                    type="button"
                    onClick={() => onToggleColumn(column.key)}
                    className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg border transition-colors",
                        visible ? "border-border/60 bg-background/70 text-foreground hover:bg-background" : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
                    )}
                    aria-label={visible ? `隐藏字段 ${column.key}` : `显示字段 ${column.key}`}
                >
                    {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
            </div>
        </div>
    );
}

export function FieldConfigPanel<T>({
    columns,
    filteredColumns,
    fieldSearch,
    onFieldSearchChange,
    isColumnVisible,
    onToggleColumn,
    onColumnMove,
    activeGroupBy,
}: {
    columns: Array<DataGridColumn<T>>;
    filteredColumns: Array<DataGridColumn<T>>;
    fieldSearch: string;
    onFieldSearchChange: (value: string) => void;
    isColumnVisible: (columnKey: string) => boolean;
    onToggleColumn: (columnKey: string) => void;
    onColumnMove: (draggedColumnKey: string, targetColumnKey: string) => void;
    activeGroupBy: string | null;
}) {
    return (
        <DndProvider backend={HTML5Backend}>
            <PanelShell>
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                        <Input
                            value={fieldSearch}
                            onChange={(event) => onFieldSearchChange(event.target.value)}
                            placeholder="搜索"
                            className="h-10 rounded-2xl border-border/60 bg-background/60 pl-9"
                        />
                    </div>

                    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                        {filteredColumns.length === 0 && <div className="text-muted-foreground px-1 py-6 text-center text-sm">无结果</div>}
                        {filteredColumns.map((column) => {
                            const visible = isColumnVisible(column.key);

                            return (
                                <SortableFieldItem
                                    key={column.key}
                                    column={column}
                                    visible={visible}
                                    isPrimary={Boolean(column.meta?.isPrimary)}
                                    isGrouped={activeGroupBy === column.key}
                                    onToggleColumn={onToggleColumn}
                                    onColumnMove={onColumnMove}
                                />
                            );
                        })}
                    </div>
                </div>
            </PanelShell>
        </DndProvider>
    );
}
