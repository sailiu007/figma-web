import { X } from "lucide-react";

import type { ResolvedFieldBehavior } from "../field-behavior";
import type { DataGridColumn, FilterOperator, FilterRule } from "../types";
import { PanelShell } from "./panel-shell";
import { RuleValueControl } from "./rule-value-control";

export function FilterPanel<T>({
    columns,
    rules,
    filterMode,
    onRuleChange,
    onRuleRemove,
    onAddRule,
    onFilterModeChange,
    getFieldBehavior,
}: {
    columns: Array<DataGridColumn<T>>;
    rules: FilterRule[];
    filterMode: "all" | "any";
    onRuleChange: (ruleId: string, patch: Partial<FilterRule>) => void;
    onRuleRemove: (ruleId: string) => void;
    onAddRule: () => void;
    onFilterModeChange: (mode: "all" | "any") => void;
    getFieldBehavior: (columnKey: string) => ResolvedFieldBehavior;
}) {
    return (
        <PanelShell title="设置筛选条件">
            <div className="space-y-3">
                {rules.length >= 2 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>符合</span>
                        <select
                            value={filterMode}
                            onChange={(event) => onFilterModeChange(event.target.value as "all" | "any")}
                            className="glass-input h-9 rounded-xl px-3 text-sm font-medium text-foreground outline-none"
                        >
                            <option value="all">所有</option>
                            <option value="any">任一</option>
                        </select>
                        <span>条件</span>
                    </div>
                )}
                {rules.map((rule) => {
                    const behavior = getFieldBehavior(rule.columnKey);
                    const selectedOperator = behavior.operatorOptions.some((option) => option.value === rule.operator)
                        ? rule.operator
                        : behavior.defaultOperator;

                    return (
                        <div key={rule.id} className="grid grid-cols-[1.1fr_0.9fr_1.2fr_auto] items-center gap-2">
                            <select
                                value={rule.columnKey}
                                onChange={(event) => {
                                    const nextColumnKey = event.target.value;
                                    const nextBehavior = getFieldBehavior(nextColumnKey);
                                    onRuleChange(rule.id, { columnKey: nextColumnKey, operator: nextBehavior.defaultOperator, value: "", value2: "" });
                                }}
                                className="glass-input rounded-xl px-3 py-2 text-sm outline-none"
                            >
                                {columns.map((column) => (
                                    <option key={column.key} value={column.key}>{typeof column.title === "string" ? column.title : column.key}</option>
                                ))}
                            </select>
                            <select
                                value={selectedOperator}
                                onChange={(event) => onRuleChange(rule.id, { operator: event.target.value as FilterOperator, value2: event.target.value === "between" ? rule.value2 ?? "" : "" })}
                                className="glass-input rounded-xl px-3 py-2 text-sm outline-none"
                            >
                                {behavior.operatorOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <RuleValueControl
                                value={rule.value}
                                value2={rule.value2}
                                isRange={selectedOperator === "between"}
                                render={behavior.renderRuleValue}
                                onChange={(value) => onRuleChange(rule.id, { value })}
                                onValue2Change={(value) => onRuleChange(rule.id, { value2: value })}
                            />
                            <button type="button" onClick={() => onRuleRemove(rule.id)} className="text-muted-foreground hover:text-foreground">
                                <X className="size-4" />
                            </button>
                        </div>
                    )
                })}
            </div>
            <button type="button" onClick={onAddRule} className="mt-4 text-sm text-foreground hover:text-foreground/80">+ 添加条件</button>
        </PanelShell>
    );
}
