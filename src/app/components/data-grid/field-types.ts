import * as React from "react";

import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { GridStatusCell } from "./cells";
import type { DataGridFieldKind, DataGridFieldOption, DataGridFieldSchema, DataGridInputMode, DataGridSortLabels, DataGridValueInputKind, FilterOperator, FilterRule } from "./types";

export type DataGridEditorControl = "input" | "select";
export type DataGridEditorInputType = "text" | "number" | "date" | "tel";
export type DataGridOptionSource = "none" | "field-or-records";
export type DataGridViewerKind = "text" | "status" | "date" | "tag-list" | "phone";

export interface DataGridFieldTypeMatchContext {
    rawValue: unknown;
    rule: Pick<FilterRule, "operator" | "value" | "value2">;
    field: DataGridFieldSchema;
    maxLength?: number;
}

export interface DataGridFieldTypeNormalizeContext {
    value: string;
    field: DataGridFieldSchema;
    maxLength?: number;
}

export interface DataGridFieldTypeValidateContext {
    inputValue: string;
    normalizedValue: unknown;
    field: DataGridFieldSchema;
    values: Record<string, unknown>;
    maxLength?: number;
}

export interface DataGridFieldTypeSortContext {
    left: unknown;
    right: unknown;
    field: DataGridFieldSchema;
    maxLength?: number;
}

export interface DataGridFieldTypeViewerContext {
    rawValue: unknown;
    fallbackContent: React.ReactNode;
    options: DataGridFieldOption[];
    columnMeta?: Record<string, unknown>;
}

export interface DataGridFieldTypeEditorContext {
    value: string;
    disabled?: boolean;
    options: DataGridFieldOption[];
    placeholder?: string;
    maxLength?: number;
    inputMode?: DataGridInputMode;
    inputType?: DataGridEditorInputType;
    multiline?: boolean;
    rows?: number;
    normalizeEditorValue: (value: string) => string;
    onChange: (value: string) => void;
}

export interface DataGridFieldTypeRuleValueContext {
    value: string;
    value2?: string;
    disabled?: boolean;
    isRange?: boolean;
    options: DataGridFieldOption[];
    placeholder?: string;
    maxLength?: number;
    inputMode?: DataGridInputMode;
    inputType?: DataGridEditorInputType;
    normalizeEditorValue: (value: string) => string;
    onChange: (value: string) => void;
    onValue2Change?: (value: string) => void;
}

export interface DataGridFieldTypePreset {
    kind: DataGridFieldKind;
    valueKind: DataGridValueInputKind;
    viewerKind: DataGridViewerKind;
    editorControl: DataGridEditorControl;
    inputType?: DataGridEditorInputType;
    operators: FilterOperator[];
    defaultOperator: FilterOperator;
    sortLabels: DataGridSortLabels;
    placeholder: string;
    inputMode?: DataGridInputMode;
    maxLength?: number;
    optionSource?: DataGridOptionSource;
    extractRecordOptions?: (rawValue: unknown) => string[];
    normalizeEditorValue?: (value: string, maxLength?: number) => string;
    normalizeInput?: (context: DataGridFieldTypeNormalizeContext) => unknown;
    validateInput?: (context: DataGridFieldTypeValidateContext) => string | undefined;
    compareValues: (context: DataGridFieldTypeSortContext) => number;
    matchFilter: (context: DataGridFieldTypeMatchContext) => boolean;
}

export const FIELD_TYPE_REGISTRY: Record<DataGridFieldKind, DataGridFieldTypePreset> = {
    text: {
        kind: "text",
        valueKind: "text",
        viewerKind: "text",
        editorControl: "input",
        inputType: "text",
        operators: ["contains", "eq", "neq"],
        defaultOperator: "contains",
        sortLabels: { asc: "A → Z", desc: "Z → A" },
        placeholder: "请输入内容",
        normalizeInput: ({ value, field }) => field.multiline ? value : value.trim(),
        compareValues: ({ left, right }) => compareTextValues(left, right),
        matchFilter: ({ rawValue, rule }) => {
            const actual = normalizeString(rawValue);
            const expected = rule.value.trim().toLowerCase();

            if (rule.operator === "contains") {
                return actual.includes(expected);
            }

            return rule.operator === "neq" ? actual !== expected : actual === expected;
        },
    },
    number: {
        kind: "number",
        valueKind: "number",
        viewerKind: "text",
        editorControl: "input",
        inputType: "number",
        operators: ["eq", "neq", "gt", "lt", "between"],
        defaultOperator: "eq",
        sortLabels: { asc: "0 → 9", desc: "9 → 0" },
        placeholder: "请输入数值",
        inputMode: "decimal",
        compareValues: ({ left, right }) => compareNumberValues(left, right),
        normalizeInput: ({ value }) => {
            const normalized = value.trim();
            return normalized === "" ? null : Number(normalized);
        },
        validateInput: ({ inputValue, field }) => {
            if (inputValue.trim() === "") {
                return;
            }

            if (Number.isNaN(Number(inputValue))) {
                return `${field.label ?? field.key}必须是数字`;
            }
        },
        matchFilter: ({ rawValue, rule }) => {
            const actual = Number(rawValue);
            const expected = Number(rule.value);
            const rangeEnd = Number(rule.value2 ?? "");

            if (Number.isNaN(actual) || Number.isNaN(expected)) {
                return false;
            }

            if (rule.operator === "between") {
                return !Number.isNaN(rangeEnd) && compareRange(actual, expected, rangeEnd);
            }

            if (rule.operator === "gt") {
                return actual > expected;
            }

            if (rule.operator === "lt") {
                return actual < expected;
            }

            return rule.operator === "neq" ? actual !== expected : actual === expected;
        },
    },
    date: {
        kind: "date",
        valueKind: "date",
        viewerKind: "date",
        editorControl: "input",
        inputType: "date",
        operators: ["eq", "gt", "lt", "between"],
        defaultOperator: "eq",
        sortLabels: { asc: "早 → 晚", desc: "晚 → 早" },
        placeholder: "选择日期",
        compareValues: ({ left, right }) => compareDateValues(left, right),
        normalizeInput: ({ value }) => value.trim(),
        matchFilter: ({ rawValue, rule }) => {
            const actual = parseDateValue(rawValue);
            const expected = parseDateValue(rule.value);
            const rangeEnd = parseDateValue(rule.value2 ?? "");

            if (actual === null || expected === null) {
                return false;
            }

            if (rule.operator === "between") {
                return rangeEnd !== null && compareRange(actual, expected, rangeEnd);
            }

            if (rule.operator === "gt") {
                return actual > expected;
            }

            if (rule.operator === "lt") {
                return actual < expected;
            }

            return rule.operator === "neq" ? actual !== expected : actual === expected;
        },
    },
    "single-select": {
        kind: "single-select",
        valueKind: "select",
        viewerKind: "status",
        editorControl: "select",
        operators: ["eq", "neq"],
        defaultOperator: "eq",
        sortLabels: { asc: "A → Z", desc: "Z → A" },
        placeholder: "请选择",
        optionSource: "field-or-records",
        extractRecordOptions: (rawValue) => {
            const normalized = normalizeOption(rawValue);
            return normalized ? [normalized] : [];
        },
        compareValues: ({ left, right }) => compareTextValues(left, right),
        normalizeInput: ({ value }) => value.trim(),
        matchFilter: ({ rawValue, rule }) => {
            const actual = normalizeString(rawValue);
            const expected = rule.value.trim().toLowerCase();
            return rule.operator === "neq" ? actual !== expected : actual === expected;
        },
    },
    "multi-select": {
        kind: "multi-select",
        valueKind: "select",
        viewerKind: "tag-list",
        editorControl: "select",
        operators: ["contains", "eq", "neq"],
        defaultOperator: "contains",
        sortLabels: { asc: "A → Z", desc: "Z → A" },
        placeholder: "请选择",
        optionSource: "field-or-records",
        extractRecordOptions: (rawValue) => {
            if (Array.isArray(rawValue)) {
                return rawValue.map(normalizeOption).filter(Boolean) as string[];
            }

            return splitMultiValues(String(rawValue ?? ""));
        },
        compareValues: ({ left, right }) => compareTextValues(toArrayComparableText(left), toArrayComparableText(right)),
        normalizeInput: ({ value }) => splitMultiValues(value),
        matchFilter: ({ rawValue, rule }) => {
            const expected = rule.value.trim().toLowerCase();
            const actualValues = Array.isArray(rawValue)
                ? rawValue.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
                : splitMultiValues(String(rawValue ?? "")).map((item) => item.toLowerCase());

            if (rule.operator === "neq") {
                return !actualValues.includes(expected);
            }

            return actualValues.includes(expected) || (rule.operator === "contains" && actualValues.some((item) => item.includes(expected)));
        },
    },
    phone: {
        kind: "phone",
        valueKind: "phone",
        viewerKind: "phone",
        editorControl: "input",
        inputType: "tel",
        operators: ["contains", "eq", "neq"],
        defaultOperator: "contains",
        sortLabels: { asc: "A → Z", desc: "Z → A" },
        placeholder: "请输入11位手机号",
        inputMode: "tel",
        maxLength: 11,
        normalizeEditorValue: (value, maxLength) => value.replace(/\D/g, "").slice(0, maxLength ?? 11),
        compareValues: ({ left, right, maxLength }) => compareTextValues(normalizePhone(left, maxLength), normalizePhone(right, maxLength)),
        normalizeInput: ({ value, maxLength }) => value.replace(/\D/g, "").slice(0, maxLength ?? 11),
        validateInput: ({ inputValue, field, maxLength }) => {
            if (inputValue.trim() === "") {
                return;
            }

            if (inputValue.replace(/\D/g, "").length !== (maxLength ?? 11)) {
                return `${field.label ?? field.key}需为${maxLength ?? 11}位`;
            }
        },
        matchFilter: ({ rawValue, rule, maxLength }) => {
            const actual = String(rawValue ?? "").replace(/\D/g, "").slice(0, maxLength ?? 11);
            const expected = rule.value.replace(/\D/g, "").slice(0, maxLength ?? 11);

            if (rule.operator === "contains") {
                return actual.includes(expected);
            }

            return rule.operator === "neq" ? actual !== expected : actual === expected;
        },
    },
};

export function getFieldTypePreset(kind: DataGridFieldKind) {
    return FIELD_TYPE_REGISTRY[kind];
}

export function renderFieldTypeViewer(preset: DataGridFieldTypePreset, context: DataGridFieldTypeViewerContext) {
    const optionLabel = resolveOptionLabel(context.rawValue, context.options);

    if (preset.viewerKind === "status") {
        const toneMap = readStatusToneMap(context.columnMeta);
        const normalized = toDisplayText(context.rawValue);
        const tone = toneMap?.[normalized] ?? "neutral";
        return React.createElement(GridStatusCell, { label: optionLabel || normalized || context.fallbackContent || "-", tone });
    }

    if (preset.viewerKind === "date") {
        return React.createElement("span", { className: "text-muted-foreground text-xs" }, toDisplayText(context.rawValue) || context.fallbackContent || "-");
    }

    if (preset.viewerKind === "tag-list") {
        const values = toArrayValues(context.rawValue);

        if (values.length > 0) {
            return React.createElement(
                "div",
                { className: "flex flex-wrap gap-1.5" },
                values.map((value) => React.createElement(Badge, {
                    key: value,
                    variant: "outline",
                    className: "rounded-full border-border/60 bg-background/40 px-2.5 py-0.5 text-xs font-medium",
                }, value)),
            );
        }
    }

    if (preset.viewerKind === "phone") {
        return React.createElement("span", { className: "font-medium tabular-nums" }, toDisplayText(context.rawValue) || context.fallbackContent || "-");
    }

    return context.fallbackContent ?? toDisplayText(context.rawValue) ?? "-";
}

export function renderFieldTypeEditor(preset: DataGridFieldTypePreset, context: DataGridFieldTypeEditorContext) {
    if (preset.editorControl === "select") {
        return React.createElement(
            "select",
            {
                value: context.value,
                disabled: context.disabled,
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => context.onChange(event.target.value),
                className: "glass-input h-10 rounded-xl px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60",
            },
            [
                React.createElement("option", { key: "__empty", value: "" }, context.placeholder ?? "请选择"),
                ...context.options.map((option) => React.createElement("option", { key: `${option.value}-${option.label}`, value: option.value }, option.label)),
            ],
        );
    }

    if (context.multiline) {
        return React.createElement(Textarea, {
            rows: context.rows,
            value: context.value,
            disabled: context.disabled,
            maxLength: context.maxLength,
            onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => context.onChange(context.normalizeEditorValue(event.target.value)),
            placeholder: context.placeholder ?? "请输入",
            className: "min-h-[112px] rounded-2xl border-border/60 bg-background/60",
        });
    }

    return React.createElement(Input, {
        type: context.inputType ?? preset.inputType ?? "text",
        inputMode: context.inputMode,
        maxLength: context.maxLength,
        value: context.value,
        disabled: context.disabled,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => context.onChange(context.normalizeEditorValue(event.target.value)),
        placeholder: context.placeholder ?? "请输入",
        className: "h-10 rounded-xl border-border/60 bg-background/60 disabled:cursor-not-allowed disabled:opacity-60",
    });
}

export function renderFieldTypeRuleValue(preset: DataGridFieldTypePreset, context: DataGridFieldTypeRuleValueContext) {
    if (preset.editorControl === "select" && context.options.length > 0) {
        return React.createElement(
            "select",
            {
                value: context.value,
                disabled: context.disabled,
                onChange: (event: React.ChangeEvent<HTMLSelectElement>) => context.onChange(event.target.value),
                className: "glass-input h-10 rounded-xl px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60",
            },
            [
                React.createElement("option", { key: "__empty", value: "" }, context.placeholder ?? "请选择"),
                ...context.options.map((option) => React.createElement("option", { key: `${option.value}-${option.label}`, value: option.value }, option.label)),
            ],
        );
    }

    const renderInput = (currentValue: string, handleChange: (value: string) => void, currentPlaceholder: string) => React.createElement(Input, {
        type: context.inputType ?? preset.inputType ?? "text",
        inputMode: context.inputMode,
        maxLength: context.maxLength,
        value: currentValue,
        disabled: context.disabled,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => handleChange(context.normalizeEditorValue(event.target.value)),
        placeholder: currentPlaceholder,
        className: "h-10 rounded-xl border-border/60 bg-background/60 disabled:cursor-not-allowed disabled:opacity-60",
    });

    if (context.isRange) {
        return React.createElement(
            "div",
            { className: "grid grid-cols-2 gap-2" },
            [
                React.createElement(React.Fragment, { key: "start" }, renderInput(context.value, context.onChange, "开始")),
                React.createElement(React.Fragment, { key: "end" }, renderInput(context.value2 ?? "", (nextValue) => context.onValue2Change?.(nextValue), "结束")),
            ],
        );
    }

    return renderInput(context.value, context.onChange, context.placeholder ?? "请输入");
}

function normalizeString(value: unknown) {
    return String(value ?? "").trim().toLowerCase();
}

function readStatusToneMap(meta: Record<string, unknown> | undefined) {
    const value = meta?.statusToneByValue;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    return value as Record<string, "neutral" | "success" | "warning" | "danger" | "info">;
}

function resolveOptionLabel(rawValue: unknown, options: DataGridFieldOption[]) {
    if (!options.length) {
        return "";
    }

    const normalized = toDisplayText(rawValue);
    if (!normalized) {
        return "";
    }

    return options.find((option) => option.value === normalized)?.label ?? normalized;
}

function compareTextValues(left: unknown, right: unknown) {
    return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
    });
}

function compareNumberValues(left: unknown, right: unknown) {
    const leftValue = Number(left);
    const rightValue = Number(right);

    if (Number.isNaN(leftValue) && Number.isNaN(rightValue)) {
        return 0;
    }

    if (Number.isNaN(leftValue)) {
        return 1;
    }

    if (Number.isNaN(rightValue)) {
        return -1;
    }

    return leftValue - rightValue;
}

function compareDateValues(left: unknown, right: unknown) {
    const leftValue = parseDateValue(left);
    const rightValue = parseDateValue(right);

    if (leftValue === null && rightValue === null) {
        return 0;
    }

    if (leftValue === null) {
        return 1;
    }

    if (rightValue === null) {
        return -1;
    }

    return leftValue - rightValue;
}

function normalizeOption(value: unknown) {
    if (typeof value !== "string" && typeof value !== "number") {
        return "";
    }

    return String(value).trim();
}

function compareRange(actual: number, start: number, end: number) {
    const [minValue, maxValue] = start <= end ? [start, end] : [end, start];
    return actual >= minValue && actual <= maxValue;
}

function parseDateValue(value: unknown) {
    const timestamp = new Date(String(value ?? "")).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

function splitMultiValues(value: string) {
    return value.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
}

function toDisplayText(value: unknown) {
    if (value == null) {
        return "";
    }

    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
    }

    return String(value).trim();
}

function toArrayValues(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    const normalized = String(value ?? "").trim();
    if (!normalized) {
        return [];
    }

    return normalized.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
}

function toArrayComparableText(value: unknown) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
    }

    return String(value ?? "").trim();
}

function normalizePhone(value: unknown, maxLength?: number) {
    return String(value ?? "").replace(/\D/g, "").slice(0, maxLength ?? 11);
}