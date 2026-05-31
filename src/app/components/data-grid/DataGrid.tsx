import * as React from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Filter,
  Group,
  Palette,
  Plus,
  Settings2,
} from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { cn } from "../ui/utils";
import type {
  ColorRule,
  DataGridCreateRecordConfig,
  DataGridEditRecordConfig,
  FilterRule,
  DataGridColumn,
  DataGridFieldSchema,
  SortRule,
  UseDataGridStateResult,
} from "./types";
import { renderDataGridCell } from "./cell-registry";
import { buildFieldSchemaFromColumn, inferFieldKindFromColumn, resolveFieldBehavior, resolveFieldDefinition } from "./field-behavior";
import { ColorPanel } from "./components/color-panel";
import { FieldConfigPanel } from "./components/field-config-panel";
import { FilterPanel } from "./components/filter-panel";
import { GridFieldBar } from "./components/grid-field-bar";
import { GridHeaderCell, getGridFieldTypeIcon } from "./components/grid-header-cell";
import { RecordFormDrawer } from "./components/record-form-drawer";
import type { RuleValueOption } from "./components/rule-value-control";
import { SortPanel } from "./components/sort-panel";

type GroupedRows<T> = Array<
  | { kind: "group"; key: string; value: string; count: number }
  | { kind: "row"; row: T }
>;

interface DataGridProps<T, Filters extends Record<string, unknown>> {
  data: T[];
  columns: Array<DataGridColumn<T>>;
  fields?: Array<DataGridFieldSchema>;
  rowKey: (row: T) => string;
  grid: UseDataGridStateResult<Filters>;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  enableSelection?: boolean;
  searchPredicate?: (row: T, search: string) => boolean;
  filterPredicate?: (row: T, filters: Filters) => boolean;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  renderToolbarStart?: React.ReactNode;
  renderToolbarEnd?: React.ReactNode;
  renderBulkActions?: (rows: T[]) => React.ReactNode;
  renderEmptyState?: React.ReactNode;
  onAddRecord?: () => void;
  createRecord?: DataGridCreateRecordConfig<T>;
  editRecord?: DataGridEditRecordConfig<T>;
  addRecordLabel?: string;
  detailDrawer?: {
    title?: string | ((row: T) => React.ReactNode);
    description?: string | ((row: T) => React.ReactNode);
    renderContent?: (row: T) => React.ReactNode;
  };
}

export function DataGrid<T, Filters extends Record<string, unknown>>({
  data,
  columns,
  fields,
  rowKey,
  grid,
  searchPlaceholder = "Search",
  pageSizeOptions = [8, 12, 20],
  enableSelection = true,
  searchPredicate,
  filterPredicate,
  onRowClick,
  getRowClassName,
  renderToolbarStart,
  renderToolbarEnd,
  renderBulkActions,
  renderEmptyState,
  onAddRecord,
  createRecord,
  editRecord,
  addRecordLabel = "添加记录",
  detailDrawer,
}: DataGridProps<T, Filters>) {
  const { state } = grid;
  const [fieldSearch, setFieldSearch] = React.useState("");
  const [sortRules, setSortRules] = React.useState<SortRule[]>([]);
  const [filterRules, setFilterRules] = React.useState<FilterRule[]>([]);
  const [colorRules, setColorRules] = React.useState<ColorRule[]>([]);
  const [filterMode, setFilterMode] = React.useState<"all" | "any">("all");
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = React.useState(false);
  const [createDraft, setCreateDraft] = React.useState<Record<string, string>>({});
  const [createErrors, setCreateErrors] = React.useState<Record<string, string>>({});
  const [isEditDrawerOpen, setIsEditDrawerOpen] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = React.useState<Record<string, string>>({});
  const showRowNumbers = true;
  const openDetailOnRowClick = Boolean(detailDrawer);
  const activeGroupBy: string | null = null;

  const defaultVisibleColumnKeys = React.useMemo(
    () => columns.filter((column) => !column.hidden).map((column) => column.key),
    [columns],
  );

  const activeVisibleColumnKeys = React.useMemo(
    () => (state.visibleColumnKeys.length > 0 ? state.visibleColumnKeys : defaultVisibleColumnKeys),
    [defaultVisibleColumnKeys, state.visibleColumnKeys],
  );

  const orderedColumns = React.useMemo(() => {
    const columnMap = new Map(columns.map((column) => [column.key, column]));
    const visibleKeySet = new Set(activeVisibleColumnKeys);
    const visibleOrdered = activeVisibleColumnKeys
      .map((key) => columnMap.get(key))
      .filter((column): column is DataGridColumn<T> => Boolean(column));
    const hiddenOrdered = columns.filter((column) => !visibleKeySet.has(column.key));

    return [...visibleOrdered, ...hiddenOrdered];
  }, [activeVisibleColumnKeys, columns]);

  const visibleColumns = React.useMemo(() => {
    const visibleKeySet = new Set(activeVisibleColumnKeys);
    return orderedColumns.filter((column) => visibleKeySet.has(column.key));
  }, [activeVisibleColumnKeys, orderedColumns]);

  const filteredFieldColumns = React.useMemo(() => {
    if (!fieldSearch.trim()) {
      return orderedColumns;
    }

    const lowered = fieldSearch.trim().toLowerCase();
    return orderedColumns.filter((column) => {
      const title = typeof column.title === "string" ? column.title : column.key;
      return title.toLowerCase().includes(lowered) || column.key.toLowerCase().includes(lowered);
    });
  }, [fieldSearch, orderedColumns]);

  const validFilterRules = React.useMemo(
    () => filterRules.filter((rule) => rule.columnKey && rule.value.trim() && (rule.operator !== "between" || Boolean(rule.value2?.trim()))),
    [filterRules],
  );
  const validColorRules = React.useMemo(
    () => colorRules.filter((rule) => rule.columnKey && (rule.scope === "column" || (rule.value.trim() && (rule.operator !== "between" || Boolean(rule.value2?.trim()))))),
    [colorRules],
  );

  const filterableColumns = React.useMemo(
    () => columns.filter((column) => column.filterable !== false && column.type !== "button"),
    [columns],
  );

  const sortableColumns = React.useMemo(
    () => columns.filter((column) => column.sortable),
    [columns],
  );

  const colorableColumns = React.useMemo(
    () => columns.filter((column) => column.filterable !== false && column.type !== "button"),
    [columns],
  );

  const fieldSchemas = React.useMemo(() => {
    if (fields && fields.length > 0) {
      return fields;
    }

    const schemaMap = new Map<string, DataGridFieldSchema>();
    columns.forEach((column) => {
      const schema = buildFieldSchemaFromColumn(column);
      if (!schemaMap.has(schema.key)) {
        schemaMap.set(schema.key, schema);
      }
    });
    return Array.from(schemaMap.values());
  }, [columns, fields]);

  const fieldSchemaMap = React.useMemo(
    () => new Map(fieldSchemas.map((field) => [field.key, field])),
    [fieldSchemas],
  );

  const getColumn = React.useCallback(
    (key: string) => columns.find((column) => column.key === key),
    [columns],
  );

  const getFieldKeyByColumn = React.useCallback(
    (columnKey: string) => getColumn(columnKey)?.fieldKey ?? columnKey,
    [getColumn],
  );

  const getFieldSchema = React.useCallback(
    (columnKey: string) => {
      const column = getColumn(columnKey);
      const fieldKey = column?.fieldKey ?? columnKey;
      return fieldSchemaMap.get(fieldKey) ?? (column ? buildFieldSchemaFromColumn(column) : undefined);
    },
    [fieldSchemaMap, getColumn],
  );

  const getRecordFieldValue = React.useCallback(
    (row: T, fieldKey: string) => {
      if (row && typeof row === "object" && fieldKey in (row as Record<string, unknown>)) {
        return (row as Record<string, unknown>)[fieldKey];
      }

      const column = columns.find((item) => (item.fieldKey ?? item.key) === fieldKey);
      if (!column) {
        return undefined;
      }

      return column.sortValue?.(row) ?? column.accessor?.(row);
    },
    [columns],
  );

  const getCellRawValue = React.useCallback(
    (row: T, column: DataGridColumn<T>) => {
      const fieldKey = column.fieldKey ?? column.key;
      const fieldValue = getRecordFieldValue(row, fieldKey);
      return fieldValue !== undefined ? fieldValue : (column.sortValue?.(row) ?? column.accessor?.(row));
    },
    [getRecordFieldValue],
  );

  const getCellComparableValue = React.useCallback(
    (row: T, columnKey: string) => {
      const column = getColumn(columnKey);
      if (!column) {
        return "";
      }
      return column.sortValue?.(row) ?? column.accessor?.(row) ?? "";
    },
    [getColumn],
  );

  const valueOptionsByColumn = React.useMemo<Record<string, RuleValueOption[]>>(() => {
    return Object.fromEntries(columns.map((column) => {
      const fieldSchema = fieldSchemaMap.get(column.fieldKey ?? column.key);

      if (fieldSchema?.options?.length) {
        return [column.key, fieldSchema.options];
      }

      const behavior = resolveFieldBehavior(fieldSchema ?? column.field, inferFieldKindFromColumn(column), []);
      if (behavior.optionSource !== "field-or-records") {
        return [column.key, []];
      }

      const uniqueValues = new Set<string>();
      for (const row of data) {
        const rawValue = getCellComparableValue(row, column.key);
        const extractedOptions = behavior.extractRecordOptions(rawValue);

        for (const optionValue of extractedOptions) {
          if (!optionValue) {
            continue;
          }

          uniqueValues.add(optionValue);
          if (uniqueValues.size >= 10) {
            break;
          }
        }

        if (uniqueValues.size >= 10) {
          break;
        }
      }

      return [column.key, Array.from(uniqueValues).map((value) => ({ label: value, value }))];
    }));
  }, [columns, data, fieldSchemaMap, getCellComparableValue]);

  const valueOptionsByFieldKey = React.useMemo<Record<string, RuleValueOption[]>>(() => {
    return Object.fromEntries(fieldSchemas.map((field) => {
      if (field.options?.length) {
        return [field.key, field.options];
      }

      const relatedOptions = columns
        .filter((column) => (column.fieldKey ?? column.key) === field.key)
        .flatMap((column) => valueOptionsByColumn[column.key] ?? []);

      const deduped = Array.from(new Map(relatedOptions.map((option) => [option.value, option])).values());
      return [field.key, deduped];
    }));
  }, [columns, fieldSchemas, valueOptionsByColumn]);

  const fieldDefinitions = React.useMemo(
    () => new Map(fieldSchemas.map((field) => [field.key, resolveFieldDefinition(field, valueOptionsByFieldKey[field.key] ?? [])])),
    [fieldSchemas, valueOptionsByFieldKey],
  );

  const getFieldBehavior = React.useCallback(
    (columnKey: string) => {
      const column = getColumn(columnKey);
      const fieldKey = column?.fieldKey ?? columnKey;
      const fieldDefinition = fieldDefinitions.get(fieldKey);
      if (fieldDefinition) {
        return fieldDefinition;
      }

      const fieldSchema = getFieldSchema(columnKey);
      return resolveFieldBehavior(fieldSchema ?? column?.field, inferFieldKindFromColumn(column), valueOptionsByFieldKey[fieldKey] ?? valueOptionsByColumn[columnKey] ?? []);
    },
    [fieldDefinitions, getColumn, getFieldSchema, valueOptionsByColumn, valueOptionsByFieldKey],
  );

  const createFieldDefinitions = React.useMemo(() => {
    if (!createRecord) {
      return [];
    }

    const selectedKeys = createRecord.fields ? new Set(createRecord.fields) : null;
    return Array.from(fieldDefinitions.values())
      .filter((field) => field.createable !== false && (!selectedKeys || selectedKeys.has(field.key)));
  }, [createRecord, fieldDefinitions]);

  const editFieldDefinitions = React.useMemo(() => {
    if (!editRecord) {
      return [];
    }

    const selectedKeys = editRecord.fields ? new Set(editRecord.fields) : null;
    return Array.from(fieldDefinitions.values())
      .filter((field) => field.editable !== false && (!selectedKeys || selectedKeys.has(field.key)));
  }, [editRecord, fieldDefinitions]);

  const buildCreateDraft = React.useCallback(
    () => Object.fromEntries(createFieldDefinitions.map((field) => [field.key, field.initialValue])),
    [createFieldDefinitions],
  );

  const buildRecordDraft = React.useCallback(
    (row: T, definitions: typeof editFieldDefinitions) => Object.fromEntries(
      definitions.map((field) => [field.key, toDraftValue(getRecordFieldValue(row, field.key) ?? field.initialValue)]),
    ),
    [getRecordFieldValue],
  );

  const handleAddAction = React.useCallback(() => {
    if (createRecord) {
      setCreateDraft(buildCreateDraft());
      setCreateErrors({});
      setIsCreateDrawerOpen(true);
      grid.setActiveRowId(null);
      return;
    }

    onAddRecord?.();
  }, [buildCreateDraft, createRecord, grid, onAddRecord]);

  const handleCreateSubmit = React.useCallback(() => {
    if (!createRecord) {
      return;
    }

    const normalizedValues = Object.fromEntries(
      createFieldDefinitions.map((field) => [field.key, field.normalize(createDraft[field.key] ?? "")]),
    );
    const nextErrors = Object.fromEntries(
      createFieldDefinitions
        .map((field) => {
          const message = field.validateInput(createDraft[field.key] ?? "", normalizedValues);
          return message ? [field.key, message] as const : null;
        })
        .filter((entry): entry is readonly [string, string] => Boolean(entry)),
    );

    setCreateErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    createRecord.onSubmit(normalizedValues);
    setIsCreateDrawerOpen(false);
    setCreateDraft(buildCreateDraft());
  }, [buildCreateDraft, createDraft, createFieldDefinitions, createRecord]);

  const editingRow = React.useMemo(
    () => data.find((row) => rowKey(row) === editingRowId) ?? null,
    [data, editingRowId, rowKey],
  );

  const handleEditAction = React.useCallback(
    (row: T) => {
      if (!editRecord) {
        return;
      }

      setEditingRowId(rowKey(row));
      setEditDraft(buildRecordDraft(row, editFieldDefinitions));
      setEditErrors({});
      setIsEditDrawerOpen(true);
      grid.setActiveRowId(null);
    },
    [buildRecordDraft, editFieldDefinitions, editRecord, grid, rowKey],
  );

  const handleEditSubmit = React.useCallback(() => {
    if (!editRecord || !editingRow) {
      return;
    }

    const normalizedValues = Object.fromEntries(
      editFieldDefinitions.map((field) => [field.key, field.normalize(editDraft[field.key] ?? "")]),
    );
    const nextErrors = Object.fromEntries(
      editFieldDefinitions
        .map((field) => {
          const message = field.validateInput(editDraft[field.key] ?? "", normalizedValues);
          return message ? [field.key, message] as const : null;
        })
        .filter((entry): entry is readonly [string, string] => Boolean(entry)),
    );

    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    editRecord.onSubmit(editingRow, normalizedValues);
    setIsEditDrawerOpen(false);
    setEditingRowId(null);
    setEditDraft({});
  }, [editDraft, editFieldDefinitions, editRecord, editingRow]);

  const matchRule = React.useCallback(
    (rawValue: unknown, rule: Pick<FilterRule, "columnKey" | "operator" | "value" | "value2">) => {
      const fieldKey = getFieldKeyByColumn(rule.columnKey);
      const fieldDefinition = fieldDefinitions.get(fieldKey);
      return fieldDefinition ? fieldDefinition.matchesFilter(rawValue, rule) : false;
    },
    [fieldDefinitions, getFieldKeyByColumn],
  );

  const searchedRows = React.useMemo(() => {
    if (!state.search.trim()) {
      return data;
    }

    if (searchPredicate) {
      return data.filter((row) => searchPredicate(row, state.search));
    }

    const lowered = state.search.trim().toLowerCase();
    return data.filter((row) =>
      columns.some((column) => {
        const raw = column.sortValue?.(row) ?? column.accessor?.(row);
        if (raw == null) {
          return false;
        }
        return String(raw).toLowerCase().includes(lowered);
      }),
    );
  }, [columns, data, searchPredicate, state.search]);

  const filteredRows = React.useMemo(() => {
    const byRules = searchedRows.filter((row) =>
      validFilterRules.length === 0
        ? true
        : filterMode === "all"
          ? validFilterRules.every((rule) =>
            matchRule(getCellComparableValue(row, rule.columnKey), rule),
          )
          : validFilterRules.some((rule) =>
            matchRule(getCellComparableValue(row, rule.columnKey), rule),
          ),
    );

    if (!filterPredicate) {
      return byRules;
    }

    return byRules.filter((row) => filterPredicate(row, state.filters));
  }, [filterMode, filterPredicate, getCellComparableValue, matchRule, searchedRows, state.filters, validFilterRules]);

  const sortedRows = React.useMemo(() => {
    if (sortRules.length === 0 && !state.sort) {
      return filteredRows;
    }

    const activeSortRules = sortRules.length > 0
      ? sortRules
      : state.sort
        ? [{ id: "fallback", columnKey: state.sort.key, direction: state.sort.direction }]
        : [];

    return [...filteredRows].sort((left, right) => {
      for (const rule of activeSortRules) {
        const leftValue = getCellComparableValue(left, rule.columnKey);
        const rightValue = getCellComparableValue(right, rule.columnKey);
        const result = getFieldBehavior(rule.columnKey).compareValues(leftValue, rightValue);
        if (result !== 0) {
          return rule.direction === "asc" ? result : result * -1;
        }
      }

      return 0;
    });
  }, [filteredRows, getCellComparableValue, sortRules, state.sort]);

  const groupedRows = React.useMemo(() => {
    if (!activeGroupBy) {
      return sortedRows.map((row) => ({ kind: "row", row }) as const);
    }

    const groupColumn = columns.find((column) => column.key === activeGroupBy);
    if (!groupColumn) {
      return sortedRows.map((row) => ({ kind: "row", row }) as const);
    }

    const groups = new Map<string, T[]>();
    for (const row of sortedRows) {
      const value = groupColumn.groupValue?.(row) ?? String(groupColumn.sortValue?.(row) ?? groupColumn.accessor?.(row) ?? "Ungrouped");
      const current = groups.get(value) ?? [];
      current.push(row);
      groups.set(value, current);
    }

    const output: GroupedRows<T> = [];
    for (const [value, rows] of groups.entries()) {
      output.push({ kind: "group", key: `${groupColumn.key}:${value}`, value, count: rows.length });
      rows.forEach((row) => output.push({ kind: "row", row }));
    }
    return output;
  }, [activeGroupBy, columns, sortedRows]);

  const rowCount = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(rowCount / state.pageSize));
  const safePage = Math.min(state.page, pageCount);
  const pagedRows = React.useMemo(() => {
    if (!activeGroupBy) {
      const start = (safePage - 1) * state.pageSize;
      return groupedRows.slice(start, start + state.pageSize);
    }

    const rowEntries = groupedRows.reduce<Array<{ kind: "row"; row: T }>>((current, item) => {
      if (item.kind === "row") {
        current.push(item);
      }
      return current;
    }, []);
    const start = (safePage - 1) * state.pageSize;
    const visibleRowIds = new Set(
      rowEntries.slice(start, start + state.pageSize).map((item) => rowKey(item.row)),
    );
    const output: GroupedRows<T> = [];
    let pendingGroup: GroupedRows<T>[number] | null = null;

    for (const item of groupedRows) {
      if (item.kind === "group") {
        pendingGroup = item;
        continue;
      }

      if (!visibleRowIds.has(rowKey(item.row))) {
        continue;
      }

      if (pendingGroup) {
        output.push(pendingGroup);
        pendingGroup = null;
      }
      output.push(item);
    }
    return output;
  }, [activeGroupBy, groupedRows, rowKey, safePage, state.pageSize]);

  React.useEffect(() => {
    if (safePage !== state.page) {
      grid.setPage(safePage);
    }
  }, [grid, safePage, state.page]);

  const selectedRows = React.useMemo(
    () => data.filter((row) => state.selectedRowIds.includes(rowKey(row))),
    [data, rowKey, state.selectedRowIds],
  );

  const currentPageRows = React.useMemo(
    () =>
      pagedRows.reduce<T[]>((current, item) => {
        if (item.kind === "row") {
          current.push(item.row);
        }
        return current;
      }, []),
    [pagedRows],
  );
  const allCurrentPageSelected =
    currentPageRows.length > 0 && currentPageRows.every((row) => state.selectedRowIds.includes(rowKey(row)));

  const activeRow = React.useMemo(
    () => data.find((row) => rowKey(row) === state.activeRowId) ?? null,
    [data, rowKey, state.activeRowId],
  );

  const rowPaddingClassName =
    state.density === "compact"
      ? "py-2 px-3"
      : state.density === "spacious"
        ? "py-4 px-4"
        : "py-3 px-3";

  const filteredCountBadge = validFilterRules.length;
  const sortedCountBadge = sortRules.length || (state.sort ? 1 : 0);
  const colorCountBadge = validColorRules.length;

  const getSortDirectionLabels = React.useCallback(
    (columnKey: string) => {
      const column = getColumn(columnKey);
      return getFieldBehavior(columnKey).sortLabels;
    },
    [getFieldBehavior, getColumn],
  );

  const getRowBackground = React.useCallback(
    (row: T) => {
      const matchedRule = validColorRules.find((rule) =>
        rule.scope === "row" && matchRule(getCellComparableValue(row, rule.columnKey), rule),
      );
      return matchedRule ? matchedRule.color : undefined;
    },
    [getCellComparableValue, matchRule, validColorRules],
  );

  const getCellBackground = React.useCallback(
    (row: T, columnKey: string) => {
      const matchedRule = validColorRules.find((rule) =>
        (rule.scope === "column" && rule.columnKey === columnKey)
        || (rule.scope === "cell" && rule.columnKey === columnKey && matchRule(getCellComparableValue(row, rule.columnKey), rule)),
      );
      return matchedRule ? matchedRule.color : undefined;
    },
    [getCellComparableValue, matchRule, validColorRules],
  );

  const addFilterRule = () => {
    const firstColumnKey = filterableColumns[0]?.key ?? visibleColumns[0]?.key ?? columns[0]?.key ?? "";
    const behavior = getFieldBehavior(firstColumnKey);
    setFilterRules((current) => [
      ...current,
      { id: crypto.randomUUID(), columnKey: firstColumnKey, operator: behavior.defaultOperator, value: "", value2: "" },
    ]);
  };

  const addSortRule = () => {
    const firstColumnKey = sortableColumns[0]?.key ?? visibleColumns[0]?.key ?? columns[0]?.key ?? "";
    setSortRules((current) => [
      ...current,
      { id: crypto.randomUUID(), columnKey: firstColumnKey, direction: "asc" },
    ]);
  };

  const moveSortRule = React.useCallback((draggedRuleId: string, targetRuleId: string) => {
    setSortRules((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggedRuleId);
      const toIndex = current.findIndex((item) => item.id === targetRuleId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [draggedRule] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedRule);
      return next;
    });
  }, []);

  const addColorRule = () => {
    const firstColumnKey = colorableColumns[0]?.key ?? visibleColumns[0]?.key ?? columns[0]?.key ?? "";
    const behavior = getFieldBehavior(firstColumnKey);
    setColorRules((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        scope: "cell",
        columnKey: firstColumnKey,
        operator: behavior.defaultOperator,
        value: "",
        value2: "",
        color: "#F8E8C8",
      },
    ]);
  };

  const moveVisibleColumn = React.useCallback((draggedColumnKey: string, targetColumnKey: string) => {
    if (!activeVisibleColumnKeys.includes(draggedColumnKey) || !activeVisibleColumnKeys.includes(targetColumnKey)) {
      return;
    }

    const fromIndex = activeVisibleColumnKeys.indexOf(draggedColumnKey);
    const toIndex = activeVisibleColumnKeys.indexOf(targetColumnKey);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }

    const next = [...activeVisibleColumnKeys];
    const [draggedColumn] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedColumn);
    grid.setVisibleColumnKeys(next);
  }, [activeVisibleColumnKeys, grid]);

  const toolbarControls = (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-md px-2 text-[13px] font-medium">
            <Settings2 className="size-4" />
            字段配置
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[290px] rounded-2xl border-border/70 p-0">
          <FieldConfigPanel
            columns={orderedColumns}
            filteredColumns={filteredFieldColumns}
            fieldSearch={fieldSearch}
            onFieldSearchChange={setFieldSearch}
            isColumnVisible={(columnKey) => activeVisibleColumnKeys.includes(columnKey)}
            onToggleColumn={grid.toggleColumnVisibility}
            onColumnMove={moveVisibleColumn}
            activeGroupBy={activeGroupBy}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-md px-2 text-[13px] font-medium data-[state=open]:bg-blue-50 data-[state=open]:text-blue-700">
            <Filter className="size-4" />
            {filteredCountBadge > 0 ? `${filteredCountBadge} 筛选` : "筛选"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[500px] rounded-2xl border-border/70 p-4">
          <FilterPanel
            columns={columns}
            getFieldBehavior={getFieldBehavior}
            rules={filterRules}
            filterMode={filterMode}
            onRuleChange={(ruleId, patch) => setFilterRules((current) => current.map((item) => item.id === ruleId ? { ...item, ...patch } : item))}
            onRuleRemove={(ruleId) => setFilterRules((current) => current.filter((item) => item.id !== ruleId))}
            onAddRule={addFilterRule}
            onFilterModeChange={setFilterMode}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-md px-2 text-[13px] font-medium data-[state=open]:bg-blue-50 data-[state=open]:text-blue-700">
            <ArrowUpDown className="size-4" />
            {sortedCountBadge > 0 ? `${sortedCountBadge} 排序` : "排序"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[520px] rounded-2xl border-border/70 p-4">
          <SortPanel
            columns={sortableColumns}
            rules={sortRules}
            onRuleChange={(ruleId, patch) => setSortRules((current) => current.map((item) => item.id === ruleId ? { ...item, ...patch } : item))}
            onRuleRemove={(ruleId) => setSortRules((current) => current.filter((item) => item.id !== ruleId))}
            onAddRule={addSortRule}
            onRuleMove={moveSortRule}
            getDirectionLabels={getSortDirectionLabels}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 rounded-md px-2 text-[13px] font-medium data-[state=open]:bg-amber-50 data-[state=open]:text-amber-700">
            <Palette className="size-4" />
            {colorCountBadge > 0 ? `${colorCountBadge} 填色` : "填色"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[640px] rounded-2xl border-border/70 p-4">
          <ColorPanel
            columns={colorableColumns}
            getFieldBehavior={getFieldBehavior}
            rules={colorRules}
            onRuleChange={(ruleId, patch) => setColorRules((current) => current.map((item) => item.id === ruleId ? { ...item, ...patch } : item))}
            onRuleRemove={(ruleId) => setColorRules((current) => current.filter((item) => item.id !== ruleId))}
            onAddRule={addColorRule}
          />
        </PopoverContent>
      </Popover>
    </>
  );

  return (
    <div className="space-y-4">
      <GridFieldBar
        left={
          <>
            {(createRecord || onAddRecord) && (
              <Button onClick={handleAddAction} variant="ghost" size="sm" className="h-8 rounded-md px-2 text-[13px] font-medium">
                <Plus className="size-4 text-blue-500" />
                {addRecordLabel}
                <ChevronDown className="size-3.5" />
              </Button>
            )}
            {toolbarControls}
            {renderToolbarStart}
          </>
        }
        right={renderToolbarEnd}
      />

      <div className="overflow-hidden rounded-xl border border-border/70 bg-background/90">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 bg-background/95 hover:bg-background/95">
              {enableSelection && (
                <TableHead className="w-10 px-2">
                  <Checkbox
                    checked={allCurrentPageSelected}
                    onCheckedChange={(checked) => {
                      grid.setSelectedRowIds(
                        checked
                          ? Array.from(new Set([...state.selectedRowIds, ...currentPageRows.map((row) => rowKey(row))]))
                          : state.selectedRowIds.filter((id) => !currentPageRows.some((row) => rowKey(row) === id)),
                      );
                    }}
                    aria-label="Select current page"
                  />
                </TableHead>
              )}
              {showRowNumbers && <TableHead className="w-12 px-2 text-center">#</TableHead>}
              {visibleColumns.map((column) => {
                const widthStyle = column.width ? { width: column.width, minWidth: column.minWidth ?? column.width } : { minWidth: column.minWidth };
                const isPrimary = Boolean(column.meta?.isPrimary);
                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "px-3 text-[13px] font-medium text-foreground/85",
                      isPrimary && "sticky left-0 z-10 bg-background/95 shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.headerClassName,
                    )}
                    style={widthStyle}
                  >
                    <GridHeaderCell
                      column={column}
                      grouped={Boolean(column.groupable && activeGroupBy === column.key)}
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={visibleColumns.length + (enableSelection ? 1 : 0) + (showRowNumbers ? 1 : 0)} className="px-4 py-14">
                  {renderEmptyState ?? (
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="text-sm font-semibold">No rows found</div>
                      <div className="text-muted-foreground text-sm">Adjust search, filters, or visible columns.</div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((item, index) => {
                if (item.kind === "group") {
                  return (
                    <TableRow key={item.key} className="bg-background/30 hover:bg-background/30">
                      <TableCell colSpan={visibleColumns.length + (enableSelection ? 1 : 0) + (showRowNumbers ? 1 : 0)} className="px-3 py-2.5">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Group className="text-muted-foreground size-4" />
                          <span>{item.value}</span>
                          <Badge variant="outline" className="rounded-full border-border/60 bg-background/40 px-2.5 py-1">
                            {item.count}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                const row = item.row;
                const id = rowKey(row);
                const isActive = state.activeRowId === id;
                const rowBackground = getRowBackground(row);
                return (
                  <TableRow
                    key={id}
                    data-state={state.selectedRowIds.includes(id) ? "selected" : undefined}
                    className={cn(
                      "border-border/60",
                      onRowClick && "cursor-pointer",
                      isActive && "bg-accent/45",
                      getRowClassName?.(row),
                    )}
                    onClick={() => {
                      if (openDetailOnRowClick && detailDrawer) {
                        grid.setActiveRowId(id);
                      }
                      onRowClick?.(row);
                    }}
                    style={rowBackground ? { backgroundColor: `${rowBackground}33` } : undefined}
                  >
                    {enableSelection && (
                      <TableCell className="px-3" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={state.selectedRowIds.includes(id)}
                          onCheckedChange={() => grid.toggleSelectedRow(id)}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </TableCell>
                    )}
                    {showRowNumbers && (
                      <TableCell className="px-2 text-center text-sm text-muted-foreground">{(safePage - 1) * state.pageSize + index + 1}</TableCell>
                    )}
                    {visibleColumns.map((column) => {
                      const fieldKey = column.fieldKey ?? column.key;
                      const fieldDefinition = fieldDefinitions.get(fieldKey);
                      const rawValue = getCellRawValue(row, column);
                      const fallbackContent = column.accessor?.(row) ?? (rawValue == null ? "-" : String(rawValue));
                      const content = column.render
                        ? column.render(row, { rowIndex: index, isActive })
                        : renderDataGridCell({ row, column, field: fieldDefinition, rawValue, fallbackContent });
                      const cellBackground = getCellBackground(row, column.key);
                      return (
                        <TableCell
                          key={column.key}
                          className={cn(
                            rowPaddingClassName,
                            Boolean(column.meta?.isPrimary) && "sticky left-0 z-[1] bg-background/90 shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]",
                            column.align === "right" && "text-right",
                            column.align === "center" && "text-center",
                            column.className,
                          )}
                        >
                          <div className={cn(cellBackground && "rounded-md px-2 py-1.5")} style={cellBackground ? { backgroundColor: cellBackground } : undefined}>
                            {content}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
            {pagedRows.length > 0 && (createRecord || onAddRecord) && !activeGroupBy && (
              <TableRow className="border-border/50 hover:bg-background/40">
                {enableSelection && <TableCell className="px-3" />}
                {showRowNumbers && (
                  <TableCell className="px-2 text-center">
                    <button type="button" onClick={handleAddAction} className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                      <Plus className="size-4" />
                    </button>
                  </TableCell>
                )}
                {visibleColumns.map((column, index) => (
                  <TableCell
                    key={`${column.key}-create`}
                    className={cn(
                      rowPaddingClassName,
                      Boolean(column.meta?.isPrimary) && "sticky left-0 z-[1] bg-background/90 shadow-[inset_-1px_0_0_rgba(0,0,0,0.05)]",
                    )}
                  >
                    {index === 0 ? (
                      <button type="button" onClick={handleAddAction} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        新增记录
                      </button>
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="text-muted-foreground text-sm">
          共 {rowCount} 条记录{state.selectedRowIds.length > 0 ? `，已选 ${state.selectedRowIds.length} 条` : ""}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/40 p-1">
            {pageSizeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => grid.setPageSize(option)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  state.pageSize === option ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}/页
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/40 p-1">
            <Button variant="ghost" size="sm" className="h-8 rounded-md px-3" disabled={safePage <= 1} onClick={() => grid.setPage(safePage - 1)}>
              上一页
            </Button>
            <div className="px-3 text-sm font-medium">{safePage} / {pageCount}</div>
            <Button variant="ghost" size="sm" className="h-8 rounded-md px-3" disabled={safePage >= pageCount} onClick={() => grid.setPage(safePage + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </div>

      {createRecord && (
        <RecordFormDrawer
          open={isCreateDrawerOpen}
          onOpenChange={setIsCreateDrawerOpen}
          title={createRecord.title ?? addRecordLabel}
          description={createRecord.description}
          fields={createFieldDefinitions}
          draft={createDraft}
          errors={createErrors}
          submitLabel={createRecord.submitLabel ?? addRecordLabel}
          onFieldChange={(fieldKey, value) => {
            setCreateDraft((current) => ({ ...current, [fieldKey]: value }));
            setCreateErrors((current) => {
              if (!current[fieldKey]) {
                return current;
              }

              const next = { ...current };
              delete next[fieldKey];
              return next;
            });
          }}
          onSubmit={handleCreateSubmit}
        />
      )}

      {editRecord && editingRow && (
        <RecordFormDrawer
          open={isEditDrawerOpen}
          onOpenChange={(open) => {
            setIsEditDrawerOpen(open);
            if (!open) {
              setEditingRowId(null);
              setEditErrors({});
            }
          }}
          title={resolveDrawerText(editRecord.title, editingRow) ?? "编辑记录"}
          description={resolveDrawerText(editRecord.description, editingRow)}
          fields={editFieldDefinitions}
          draft={editDraft}
          errors={editErrors}
          submitLabel={editRecord.submitLabel ?? "保存修改"}
          onFieldChange={(fieldKey, value) => {
            setEditDraft((current) => ({ ...current, [fieldKey]: value }));
            setEditErrors((current) => {
              if (!current[fieldKey]) {
                return current;
              }

              const next = { ...current };
              delete next[fieldKey];
              return next;
            });
          }}
          onSubmit={handleEditSubmit}
        />
      )}

      {detailDrawer && activeRow && (
        <Drawer open={Boolean(activeRow)} onOpenChange={(open) => !open && grid.setActiveRowId(null)} direction="right">
          <DrawerContent className="glass-strong h-full w-[min(560px,100vw)] border-l border-border/60 bg-popover/95 p-0 sm:max-w-none">
            <DrawerHeader className="border-b border-border/60 px-6 py-5">
              <DrawerTitle>
                {typeof detailDrawer.title === "function" ? detailDrawer.title(activeRow) : detailDrawer.title}
              </DrawerTitle>
              {detailDrawer.description && (
                <DrawerDescription>
                  {typeof detailDrawer.description === "function"
                    ? detailDrawer.description(activeRow)
                    : detailDrawer.description}
                </DrawerDescription>
              )}
            </DrawerHeader>
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-6">{detailDrawer.renderContent?.(activeRow) ?? null}</div>
              {editRecord ? (
                <div className="flex justify-end border-t border-border/60 px-6 py-4">
                  <Button size="sm" className="h-9 rounded-xl px-4" onClick={() => handleEditAction(activeRow)}>
                    编辑记录
                  </Button>
                </div>
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function toDraftValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  return String(value);
}

function resolveDrawerText<T>(value: string | ((row: T) => React.ReactNode) | undefined, row: T) {
  if (!value) {
    return undefined;
  }

  const resolved = typeof value === "function" ? value(row) : value;
  return typeof resolved === "string" ? resolved : String(resolved);
}
