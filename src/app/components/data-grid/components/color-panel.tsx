import { Check, GripVertical, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import type { ResolvedFieldBehavior } from "../field-behavior";
import type { ColorRule, ColorScope, DataGridColumn, FilterOperator } from "../types";
import { PanelShell } from "./panel-shell";
import { RuleValueControl } from "./rule-value-control";

const COLOR_SWATCH_ROWS = [
    ["#FCE7E7", "#FDEDDC", "#FCF4D4", "#EEF6D6", "#E3F4DF", "#DDF4F1", "#DFF0FA", "#E4ECFB", "#F2E1EA", "#EDE3F8", "#EBEBEB"],
    ["#F7C9C7", "#F8D7B0", "#F6E6A6", "#DDEDAE", "#BDE5B9", "#B8E7DF", "#B8E5F4", "#BDD4F6", "#E8B6CF", "#DCC2F2", "#DCDCDC"],
    ["#F3AAA6", "#F3BF8D", "#F2D67B", "#CDE07E", "#93D49D", "#88D8CF", "#89D0EA", "#91B7F0", "#D98CB5", "#C39AE6", "#C9C9C9"],
    ["#EE8D89", "#EFA768", "#E8C957", "#ABD064", "#68C07E", "#58C2B5", "#60B7DA", "#6F99E3", "#C76497", "#A86ED7", "#B5B5B5"],
] as const;

export function ColorPanel<T>({
    columns,
    rules,
    onRuleChange,
    onRuleRemove,
    onAddRule,
    getFieldBehavior,
}: {
    columns: Array<DataGridColumn<T>>;
    rules: ColorRule[];
    onRuleChange: (ruleId: string, patch: Partial<ColorRule>) => void;
    onRuleRemove: (ruleId: string) => void;
    onAddRule: () => void;
    getFieldBehavior: (columnKey: string) => ResolvedFieldBehavior;
}) {
    return (
        <PanelShell title="设置填色条件">
            <div className="space-y-3">
                {rules.map((rule) => {
                    const isColumnScope = rule.scope === "column";
                    const behavior = getFieldBehavior(rule.columnKey);
                    const selectedOperator = behavior.operatorOptions.some((option) => option.value === rule.operator)
                        ? rule.operator
                        : behavior.defaultOperator;

                    return (
                        <div key={rule.id} className="grid grid-cols-[20px_32px_86px_1.05fr_0.9fr_1.1fr_auto] items-center gap-2">
                            <div className="flex items-center justify-center text-muted-foreground">
                                <GripVertical className="size-4" />
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex h-8 w-8 items-center justify-center border border-border/60"
                                        style={{ backgroundColor: rule.color }}
                                        aria-label="选择颜色"
                                    >
                                        <span className="sr-only">选择颜色</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent align="start" className="w-[294px] rounded-2xl border-border/70 p-3">
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">颜色</div>
                                        {COLOR_SWATCH_ROWS.map((row, rowIndex) => (
                                            <div key={`row-${rowIndex}`} className={`grid grid-cols-11 gap-2 ${rowIndex === 0 ? "mb-4" : ""}`}>
                                                {row.map((color) => {
                                                    const selected = color.toLowerCase() === rule.color.toLowerCase();

                                                    return (
                                                        <button
                                                            key={color}
                                                            type="button"
                                                            onClick={() => onRuleChange(rule.id, { color })}
                                                            className={[
                                                                "relative h-5 w-5 border",
                                                                rowIndex === 0 ? "border-border/50" : "border-transparent",
                                                                selected ? "ring-2 ring-blue-500/35" : "",
                                                            ].join(" ")}
                                                            style={{ backgroundColor: color }}
                                                            aria-label={`选择颜色 ${color}`}
                                                        >
                                                            {selected ? <Check className="mx-auto size-3 text-foreground" /> : null}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <select value={rule.scope} onChange={(event) => onRuleChange(rule.id, { scope: event.target.value as ColorScope })} className="glass-input rounded-xl px-3 py-2 text-sm outline-none">
                                <option value="cell">单元格</option>
                                <option value="row">整行</option>
                                <option value="column">整列</option>
                            </select>
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
                                disabled={isColumnScope}
                                onChange={(event) => onRuleChange(rule.id, { operator: event.target.value as FilterOperator, value2: event.target.value === "between" ? rule.value2 ?? "" : "" })}
                                className="glass-input rounded-xl px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {behavior.operatorOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            {isColumnScope ? (
                                <div className="flex items-center rounded-xl border border-dashed border-border/60 bg-background/40 px-3 text-sm text-muted-foreground">
                                    整列
                                </div>
                            ) : (
                                <RuleValueControl
                                    value={rule.value}
                                    value2={rule.value2}
                                    isRange={selectedOperator === "between"}
                                    render={behavior.renderRuleValue}
                                    onChange={(value) => onRuleChange(rule.id, { value })}
                                    onValue2Change={(value) => onRuleChange(rule.id, { value2: value })}
                                />
                            )}
                            <button type="button" onClick={() => onRuleRemove(rule.id)} className="text-muted-foreground hover:text-foreground">
                                <X className="size-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
            <button type="button" onClick={onAddRule} className="mt-4 text-sm text-foreground hover:text-foreground/80">+ 添加条件</button>
        </PanelShell>
    );
}
