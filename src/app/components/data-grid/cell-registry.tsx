import * as React from "react";

import { GridAvatarStackCell, GridEntityCell, GridProgressCell } from "./cells";
import type { ResolvedFieldDefinition } from "./field-behavior";
import type { DataGridColumn } from "./types";

interface RenderDataGridCellContext<T> {
    row: T;
    column: DataGridColumn<T>;
    field?: ResolvedFieldDefinition;
    rawValue: unknown;
    fallbackContent: React.ReactNode;
}

export function renderDataGridCell<T>({
    row,
    column,
    field,
    rawValue,
    fallbackContent,
}: RenderDataGridCellContext<T>) {
    if (column.type === "entity") {
        const titleField = readMetaField(column, "titleField");
        const descriptionField = readMetaField(column, "descriptionField");
        const accentField = readMetaField(column, "accentField");
        const title = titleField ? getRowValue(row, titleField) : rawValue;
        const description = descriptionField ? getRowValue(row, descriptionField) : undefined;
        const accent = accentField ? getRowValue(row, accentField) : undefined;

        return (
            <GridEntityCell
                title={toDisplayText(title) || fallbackContent}
                description={toDisplayText(description)}
                accent={typeof accent === "string" ? accent : undefined}
            />
        );
    }

    if (column.type === "progress") {
        const value = toNumericValue(rawValue);
        const accentField = readMetaField(column, "accentField");
        const accent = accentField ? getRowValue(row, accentField) : undefined;

        if (value !== null) {
            return <GridProgressCell value={value} accent={typeof accent === "string" ? accent : undefined} />;
        }
    }

    if (column.type === "avatar-list") {
        const value = toNumericValue(rawValue);
        const colors = readMetaStringArray(column, "avatarColors") ?? DEFAULT_AVATAR_COLORS;

        if (value !== null) {
            return <GridAvatarStackCell count={value} colors={colors} />;
        }
    }

    if (field) {
        return field.renderViewer({ rawValue, fallbackContent, columnMeta: column.meta });
    }

    return fallbackContent ?? toDisplayText(rawValue) ?? "-";
}

function getRowValue<T>(row: T, key: string) {
    if (!row || typeof row !== "object") {
        return undefined;
    }

    return (row as Record<string, unknown>)[key];
}

function readMetaField<T>(column: DataGridColumn<T>, key: string) {
    const value = column.meta?.[key];
    return typeof value === "string" ? value : undefined;
}

function readMetaStringArray<T>(column: DataGridColumn<T>, key: string) {
    const value = column.meta?.[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
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

function toNumericValue(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

const DEFAULT_AVATAR_COLORS = ["#8b5cf6", "#22d3ee", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];