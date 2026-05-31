import * as React from "react";

import { GripVertical, X } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import type { DataGridColumn, SortRule } from "../types";
import { PanelShell } from "./panel-shell";

const SORT_RULE_ITEM_TYPE = "data-grid-sort-rule";

function SortRuleItem<T>({
    rule,
    columns,
    labels,
    onRuleChange,
    onRuleRemove,
    onRuleMove,
}: {
    rule: SortRule;
    columns: Array<DataGridColumn<T>>;
    labels: { asc: string; desc: string };
    onRuleChange: (ruleId: string, patch: Partial<SortRule>) => void;
    onRuleRemove: (ruleId: string) => void;
    onRuleMove: (draggedRuleId: string, targetRuleId: string) => void;
}) {
    const rowRef = React.useRef<HTMLDivElement | null>(null);
    const handleRef = React.useRef<HTMLDivElement | null>(null);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: SORT_RULE_ITEM_TYPE,
        item: { id: rule.id },
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [rule.id]);

    const [, drop] = useDrop(() => ({
        accept: SORT_RULE_ITEM_TYPE,
        drop: (item: { id: string }) => {
            if (item.id !== rule.id) {
                onRuleMove(item.id, rule.id);
            }
        },
    }), [onRuleMove, rule.id]);

    drag(handleRef);
    drop(rowRef);

    return (
        <div
            ref={rowRef}
            className={`grid grid-cols-[20px_1.1fr_1.3fr_auto] items-center gap-2 ${isDragging ? "opacity-50" : ""}`}
        >
            <div ref={handleRef} className="flex cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing">
                <GripVertical className="size-4" />
            </div>
            <select value={rule.columnKey} onChange={(event) => onRuleChange(rule.id, { columnKey: event.target.value })} className="glass-input rounded-xl px-3 py-2 text-sm outline-none">
                {columns.map((column) => (
                    <option key={column.key} value={column.key}>{typeof column.title === "string" ? column.title : column.key}</option>
                ))}
            </select>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 p-1">
                <button type="button" onClick={() => onRuleChange(rule.id, { direction: "asc" })} className={`rounded-lg px-3 py-2 text-sm ${rule.direction === "asc" ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200' : ''}`}>{labels.asc}</button>
                <button type="button" onClick={() => onRuleChange(rule.id, { direction: "desc" })} className={`rounded-lg px-3 py-2 text-sm ${rule.direction === "desc" ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200' : ''}`}>{labels.desc}</button>
            </div>
            <button type="button" onClick={() => onRuleRemove(rule.id)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
            </button>
        </div>
    );
}

export function SortPanel<T>({
    columns,
    rules,
    onRuleChange,
    onRuleRemove,
    onAddRule,
    onRuleMove,
    getDirectionLabels,
}: {
    columns: Array<DataGridColumn<T>>;
    rules: SortRule[];
    onRuleChange: (ruleId: string, patch: Partial<SortRule>) => void;
    onRuleRemove: (ruleId: string) => void;
    onAddRule: () => void;
    onRuleMove: (draggedRuleId: string, targetRuleId: string) => void;
    getDirectionLabels: (columnKey: string) => { asc: string; desc: string };
}) {
    return (
        <DndProvider backend={HTML5Backend}>
            <PanelShell title="设置排序条件">
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <SortRuleItem
                            key={rule.id}
                            rule={rule}
                            columns={columns}
                            labels={getDirectionLabels(rule.columnKey)}
                            onRuleChange={onRuleChange}
                            onRuleRemove={onRuleRemove}
                            onRuleMove={onRuleMove}
                        />
                    ))}
                </div>
                <button type="button" onClick={onAddRule} className="mt-4 text-sm text-foreground hover:text-foreground/80">+ 添加条件</button>
            </PanelShell>
        </DndProvider>
    );
}
