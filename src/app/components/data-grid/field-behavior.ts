import type { ReactNode } from "react";

import type {
    DataGridColumn,
    DataGridFieldConfig,
    DataGridFieldSchema,
    DataGridFieldKind,
    DataGridInputMode,
    DataGridSortLabels,
    DataGridValueInputKind,
    FilterOperator,
    FilterRule,
} from "./types";
import type { RuleValueOption } from "./components/rule-value-control";
import { getFieldTypePreset, renderFieldTypeEditor, renderFieldTypeRuleValue, renderFieldTypeViewer, type DataGridEditorControl, type DataGridEditorInputType, type DataGridFieldTypePreset, type DataGridOptionSource, type DataGridViewerKind } from "./field-types";

export interface FilterOperatorOption {
    value: FilterOperator;
    label: string;
}

export interface ResolvedFieldBehavior {
    kind: DataGridFieldKind;
    valueKind: DataGridValueInputKind;
    viewerKind: DataGridViewerKind;
    editorControl: DataGridEditorControl;
    inputType?: DataGridEditorInputType;
    operatorOptions: FilterOperatorOption[];
    defaultOperator: FilterOperator;
    sortLabels: DataGridSortLabels;
    options: RuleValueOption[];
    optionSource: DataGridOptionSource;
    extractRecordOptions: (rawValue: unknown) => string[];
    maxLength?: number;
    placeholder?: string;
    inputMode?: DataGridInputMode;
    normalizeEditorValue: (value: string) => string;
    compareValues: (left: unknown, right: unknown) => number;
    renderRuleValue: (context: {
        value: string;
        value2?: string;
        disabled?: boolean;
        isRange?: boolean;
        onChange: (value: string) => void;
        onValue2Change?: (value: string) => void;
    }) => ReactNode;
}

export interface ResolvedFieldDefinition extends ResolvedFieldBehavior {
    key: string;
    label: string;
    description?: string;
    required: boolean;
    createable: boolean;
    editable: boolean;
    multiline: boolean;
    rows: number;
    initialValue: string;
    normalize: (value: string) => unknown;
    validateInput: (value: string, values: Record<string, unknown>) => string | undefined;
    matchesFilter: (rawValue: unknown, rule: Pick<FilterRule, "operator" | "value" | "value2">) => boolean;
    renderEditor: (context: { value: string; disabled?: boolean; onChange: (value: string) => void }) => ReactNode;
    renderViewer: (context: { rawValue: unknown; fallbackContent: ReactNode; columnMeta?: Record<string, unknown> }) => ReactNode;
}

const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
    contains: "包含",
    eq: "等于",
    neq: "不等于",
    gt: "大于",
    lt: "小于",
    between: "范围",
};

const COLUMN_TYPE_TO_FIELD_KIND: Partial<Record<NonNullable<DataGridColumn<unknown>["type"]>, DataGridFieldKind>> = {
    date: "date",
    number: "number",
    progress: "number",
    rating: "number",
    duration: "number",
    status: "single-select",
    tag: "single-select",
};

export function resolveFieldBehavior(fieldConfig: DataGridFieldConfig | undefined, inferredKind: DataGridFieldKind = "text", fallbackOptions: RuleValueOption[] = []): ResolvedFieldBehavior {
    const kind = getFieldKind(fieldConfig, inferredKind);
    const preset = getFieldTypePreset(kind);
    const operators = resolveOperators(fieldConfig, preset);
    const defaultOperator = resolveDefaultOperator(fieldConfig, preset, operators);

    return {
        kind,
        valueKind: fieldConfig?.behavior?.valueKind ?? preset.valueKind,
        viewerKind: preset.viewerKind,
        editorControl: preset.editorControl,
        inputType: preset.inputType,
        operatorOptions: operators.map((value) => ({ value, label: FILTER_OPERATOR_LABELS[value] })),
        defaultOperator,
        sortLabels: fieldConfig?.behavior?.sortLabels ?? preset.sortLabels,
        options: resolveOptions(fieldConfig, preset, fallbackOptions),
        optionSource: preset.optionSource ?? "none",
        extractRecordOptions: (rawValue: unknown) => preset.extractRecordOptions?.(rawValue) ?? [],
        maxLength: fieldConfig?.maxLength ?? preset.maxLength,
        placeholder: fieldConfig?.placeholder ?? preset.placeholder,
        inputMode: fieldConfig?.behavior?.inputMode ?? preset.inputMode,
        normalizeEditorValue: (value: string) => normalizeEditorValue(value, preset, fieldConfig?.maxLength ?? preset.maxLength),
        compareValues: (left: unknown, right: unknown) => preset.compareValues({ left, right, field: toFieldSchema(fieldConfig, kind), maxLength: fieldConfig?.maxLength ?? preset.maxLength }),
        renderRuleValue: ({ value, value2, disabled, isRange, onChange, onValue2Change }) => renderFieldTypeRuleValue(preset, {
            value,
            value2,
            disabled,
            isRange,
            options: resolveOptions(fieldConfig, preset, fallbackOptions),
            placeholder: fieldConfig?.placeholder ?? preset.placeholder,
            maxLength: fieldConfig?.maxLength ?? preset.maxLength,
            inputMode: fieldConfig?.behavior?.inputMode ?? preset.inputMode,
            inputType: preset.inputType,
            normalizeEditorValue: (nextValue: string) => normalizeEditorValue(nextValue, preset, fieldConfig?.maxLength ?? preset.maxLength),
            onChange,
            onValue2Change,
        }),
    };
}

export function inferFieldKindFromColumn<T>(column: DataGridColumn<T> | undefined): DataGridFieldKind {
    if (column?.field?.kind) {
        return column.field.kind;
    }

    return column?.type ? COLUMN_TYPE_TO_FIELD_KIND[column.type] ?? "text" : "text";
}

export function buildFieldSchemaFromColumn<T>(column: DataGridColumn<T>): DataGridFieldSchema {
    return {
        key: column.fieldKey ?? column.key,
        label: typeof column.title === "string" && column.title ? column.title : column.key,
        ...column.field,
        kind: column.field?.kind ?? inferFieldKindFromColumn(column),
        createable: column.field?.createable ?? false,
        editable: column.field?.editable ?? true,
    };
}

export function resolveFieldDefinition(field: DataGridFieldSchema, fallbackOptions: RuleValueOption[] = []): ResolvedFieldDefinition {
    const behavior = resolveFieldBehavior(field, field.kind ?? "text", fallbackOptions);
    const initialValue = toInputValue(resolveDefaultValue(field));
    const fieldType = getFieldTypePreset(behavior.kind);

    return {
        ...behavior,
        key: field.key,
        label: field.label ?? field.key,
        description: field.description,
        required: field.required === true,
        createable: field.createable !== false,
        editable: field.editable !== false,
        multiline: field.multiline === true,
        rows: field.rows ?? 4,
        initialValue,
        normalize: (value: string) => normalizeInputValue(value, fieldType, behavior, field),
        validateInput: (value: string, values: Record<string, unknown>) => validateInputValue(value, values, fieldType, field, behavior),
        renderEditor: ({ value, disabled, onChange }) => renderFieldTypeEditor(fieldType, {
            value,
            disabled,
            options: behavior.options,
            placeholder: behavior.placeholder,
            maxLength: behavior.maxLength,
            inputMode: behavior.inputMode,
            inputType: behavior.inputType,
            multiline: field.multiline === true,
            rows: field.rows ?? 4,
            normalizeEditorValue: behavior.normalizeEditorValue,
            onChange,
        }),
        renderViewer: ({ rawValue, fallbackContent, columnMeta }) => renderFieldTypeViewer(fieldType, {
            rawValue,
            fallbackContent,
            options: behavior.options,
            columnMeta,
        }),
        matchesFilter: (rawValue: unknown, rule: Pick<FilterRule, "operator" | "value" | "value2">) => {
            const primaryValue = rule.value.trim();
            const secondaryValue = rule.value2?.trim() ?? "";

            if (!primaryValue) {
                return true;
            }

            if (rule.operator === "between" && !secondaryValue) {
                return false;
            }

            return fieldType.matchFilter({ rawValue, rule, field, maxLength: behavior.maxLength });
        },
    };
}

function getFieldKind(fieldConfig: DataGridFieldConfig | undefined, inferredKind: DataGridFieldKind): DataGridFieldKind {
    return fieldConfig?.kind ?? inferredKind;
}

function resolveOperators(fieldConfig: DataGridFieldConfig | undefined, preset: DataGridFieldTypePreset) {
    const configuredOperators = fieldConfig?.behavior?.operators;

    if (!configuredOperators || configuredOperators.length === 0) {
        return preset.operators;
    }

    return Array.from(new Set(configuredOperators));
}

function resolveDefaultOperator(
    fieldConfig: DataGridFieldConfig | undefined,
    preset: DataGridFieldTypePreset,
    operators: FilterOperator[],
) {
    const candidate = fieldConfig?.behavior?.defaultOperator ?? preset.defaultOperator;
    return operators.includes(candidate) ? candidate : operators[0];
}

function resolveOptions(
    fieldConfig: DataGridFieldConfig | undefined,
    preset: DataGridFieldTypePreset,
    fallbackOptions: RuleValueOption[],
) {
    if (fieldConfig?.options && fieldConfig.options.length > 0) {
        return fieldConfig.options;
    }

    if (preset.optionSource === "field-or-records") {
        return fallbackOptions;
    }

    return [];
}

function toFieldSchema(fieldConfig: DataGridFieldConfig | undefined, kind: DataGridFieldKind): DataGridFieldSchema {
    return {
        key: fieldConfig?.label ?? kind,
        kind,
        ...fieldConfig,
    };
}

function normalizeEditorValue(value: string, preset: DataGridFieldTypePreset, maxLength?: number) {
    if (preset.normalizeEditorValue) {
        return preset.normalizeEditorValue(value, maxLength);
    }

    return maxLength ? value.slice(0, maxLength) : value;
}

function resolveDefaultValue(field: DataGridFieldSchema) {
    return typeof field.defaultValue === "function" ? field.defaultValue() : (field.defaultValue ?? "");
}

function toInputValue(value: unknown) {
    if (value == null) {
        return "";
    }

    if (Array.isArray(value)) {
        return value.join(", ");
    }

    return String(value);
}

function normalizeInputValue(
    value: string,
    fieldType: DataGridFieldTypePreset,
    behavior: ResolvedFieldBehavior,
    field: DataGridFieldSchema,
) {
    if (fieldType.normalizeInput) {
        return fieldType.normalizeInput({ value, field, maxLength: behavior.maxLength });
    }

    return field.multiline ? value : value.trim();
}

function validateInputValue(
    value: string,
    values: Record<string, unknown>,
    fieldType: DataGridFieldTypePreset,
    field: DataGridFieldSchema,
    behavior: ResolvedFieldBehavior,
) {
    const normalized = normalizeInputValue(value, fieldType, behavior, field);
    const displayLabel = field.label ?? field.key;
    const stringValue = typeof normalized === "string" ? normalized.trim() : normalized;

    if (field.required && (stringValue === "" || stringValue == null)) {
        return `请填写${displayLabel}`;
    }

    const typeMessage = fieldType.validateInput?.({
        inputValue: value,
        normalizedValue: normalized,
        field,
        values,
        maxLength: behavior.maxLength,
    });

    if (typeMessage) {
        return typeMessage;
    }

    return field.validate?.(normalized, { values });
}