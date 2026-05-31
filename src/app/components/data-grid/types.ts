import * as React from "react";

export type DataGridDensity = "compact" | "comfortable" | "spacious";
export type DataGridSortDirection = "asc" | "desc";
export type FilterOperator = "contains" | "eq" | "neq" | "gt" | "lt" | "between";
export type SortDirection = "asc" | "desc";
export type ColorScope = "cell" | "row" | "column";
export type DataGridFieldKind = "text" | "number" | "date" | "single-select" | "multi-select" | "phone";
export type DataGridValueInputKind = "text" | "select" | "number" | "date" | "phone";
export type DataGridInputMode = "text" | "numeric" | "decimal" | "tel";

export interface DataGridFieldOption {
    label: string;
    value: string;
}

export interface DataGridSortLabels {
    asc: string;
    desc: string;
}

export interface DataGridFieldBehaviorConfig {
    valueKind?: DataGridValueInputKind;
    operators?: FilterOperator[];
    defaultOperator?: FilterOperator;
    sortLabels?: DataGridSortLabels;
    inputMode?: DataGridInputMode;
}

export interface DataGridFieldValidationContext {
    values: Record<string, unknown>;
}

export interface DataGridFieldConfig {
    label?: string;
    description?: string;
    kind?: DataGridFieldKind;
    options?: DataGridFieldOption[];
    maxLength?: number;
    placeholder?: string;
    required?: boolean;
    createable?: boolean;
    editable?: boolean;
    defaultValue?: unknown | (() => unknown);
    multiline?: boolean;
    rows?: number;
    validate?: (value: unknown, context: DataGridFieldValidationContext) => string | undefined;
    behavior?: DataGridFieldBehaviorConfig;
}

export interface DataGridFieldSchema extends DataGridFieldConfig {
    key: string;
}

export interface DataGridCreateRecordConfig<T> {
    title?: string;
    description?: string;
    submitLabel?: string;
    fields?: string[];
    onSubmit: (values: Record<string, unknown>) => void;
}

export interface DataGridEditRecordConfig<T> {
    title?: string | ((row: T) => React.ReactNode);
    description?: string | ((row: T) => React.ReactNode);
    submitLabel?: string;
    fields?: string[];
    onSubmit: (row: T, values: Record<string, unknown>) => void;
}

export interface DataGridSort {
    key: string;
    direction: DataGridSortDirection;
}

export interface FilterRule {
    id: string;
    columnKey: string;
    operator: FilterOperator;
    value: string;
    value2?: string;
}

export interface SortRule {
    id: string;
    columnKey: string;
    direction: SortDirection;
}

export interface ColorRule {
    id: string;
    scope: ColorScope;
    columnKey: string;
    operator: FilterOperator;
    value: string;
    value2?: string;
    color: string;
}

export interface DataGridColumn<T> {
    key: string;
    fieldKey?: string;
    title: React.ReactNode;
    type?:
    | "text"
    | "entity"
    | "status"
    | "date"
    | "number"
    | "progress"
    | "rating"
    | "duration"
    | "tag"
    | "button"
    | "avatar-list"
    | "json-preview"
    | "attachment-preview"
    | "custom";
    width?: number | string;
    minWidth?: number | string;
    align?: "left" | "center" | "right";
    sortable?: boolean;
    filterable?: boolean;
    groupable?: boolean;
    resizable?: boolean;
    sticky?: "left" | "right";
    hidden?: boolean;
    className?: string;
    headerClassName?: string;
    accessor?: (row: T) => React.ReactNode;
    sortValue?: (row: T) => string | number;
    groupValue?: (row: T) => string;
    render?: (row: T, context: { rowIndex: number; isActive: boolean }) => React.ReactNode;
    field?: DataGridFieldConfig;
    meta?: Record<string, unknown>;
}

export interface DataGridState<Filters extends Record<string, unknown>> {
    search: string;
    filters: Filters;
    sort: DataGridSort | null;
    groupBy: string | null;
    density: DataGridDensity;
    page: number;
    pageSize: number;
    selectedRowIds: string[];
    activeRowId: string | null;
    visibleColumnKeys: string[];
}

export interface UseDataGridStateOptions<Filters extends Record<string, unknown>> {
    filters: Filters;
    pageSize?: number;
    density?: DataGridDensity;
    visibleColumnKeys?: string[];
}

export interface UseDataGridStateResult<Filters extends Record<string, unknown>> {
    state: DataGridState<Filters>;
    setSearch: (value: string) => void;
    setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
    setSort: (sort: DataGridSort | null) => void;
    toggleSort: (key: string) => void;
    setGroupBy: (key: string | null) => void;
    setDensity: (density: DataGridDensity) => void;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    toggleSelectedRow: (rowId: string) => void;
    setSelectedRowIds: (rowIds: string[]) => void;
    clearSelection: () => void;
    setActiveRowId: (rowId: string | null) => void;
    setVisibleColumnKeys: (keys: string[]) => void;
    toggleColumnVisibility: (key: string) => void;
    resetQuery: () => void;
}
