import {
    CalendarDays,
    ChevronDown,
    Group,
    ListFilter,
    Sigma,
    Type,
    Users,
} from "lucide-react";

import { cn } from "../../ui/utils";
import type { DataGridColumn } from "../types";

export function getGridFieldTypeIcon<T>(column: DataGridColumn<T>) {
    switch (column.type) {
        case "date":
            return CalendarDays;
        case "status":
            return ListFilter;
        case "progress":
            return Sigma;
        case "avatar-list":
            return Users;
        default:
            return Type;
    }
}

export function GridHeaderCell<T>({
    column,
    grouped,
}: {
    column: DataGridColumn<T>;
    grouped: boolean;
}) {
    const Icon = getGridFieldTypeIcon(column);
    const isPrimary = Boolean(column.meta?.isPrimary);

    return (
        <div
            className={cn(
                "group inline-flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left",
                column.align === "right" && "justify-end",
                column.align === "center" && "justify-center",
            )}
        >
            <span
                className={cn(
                    "inline-flex size-5 items-center justify-center rounded-md border text-muted-foreground",
                    isPrimary ? "border-blue-200 bg-blue-50 text-blue-700" : "border-border/60 bg-background/65",
                )}
            >
                <Icon className="size-3.5" />
            </span>
            <span className={cn("truncate", isPrimary && "font-semibold")}>{column.title}</span>
            {grouped && <Group className="size-3.5 shrink-0 text-blue-600" />}
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
    );
}
