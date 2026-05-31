import * as React from "react";

import type {
  DataGridDensity,
  DataGridSort,
  DataGridState,
  UseDataGridStateOptions,
  UseDataGridStateResult,
} from "../types";

export function useDataGridState<Filters extends Record<string, unknown>>(
  options: UseDataGridStateOptions<Filters>,
): UseDataGridStateResult<Filters> {
  const initialFilters = React.useMemo(() => options.filters, []);
  const initialVisibleColumnKeys = React.useMemo(
    () => options.visibleColumnKeys ?? [],
    [],
  );
  const [state, setState] = React.useState<DataGridState<Filters>>({
    search: "",
    filters: options.filters,
    sort: null,
    groupBy: null,
    density: options.density ?? "comfortable",
    page: 1,
    pageSize: options.pageSize ?? 8,
    selectedRowIds: [],
    activeRowId: null,
    visibleColumnKeys: initialVisibleColumnKeys,
  });

  const setSearch = (search: string) =>
    setState((current) => ({ ...current, search, page: 1 }));

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setState((current) => ({
      ...current,
      filters: { ...current.filters, [key]: value },
      page: 1,
    }));

  const setSort = (sort: DataGridSort | null) =>
    setState((current) => ({ ...current, sort, page: 1 }));

  const toggleSort = (key: string) =>
    setState((current) => {
      if (!current.sort || current.sort.key !== key) {
        return {
          ...current,
          sort: { key, direction: "asc" },
          page: 1,
        };
      }

      if (current.sort.direction === "asc") {
        return {
          ...current,
          sort: { key, direction: "desc" },
          page: 1,
        };
      }

      return {
        ...current,
        sort: null,
        page: 1,
      };
    });

  const setGroupBy = (groupBy: string | null) =>
    setState((current) => ({ ...current, groupBy, page: 1 }));

  const setDensity = (density: DataGridDensity) =>
    setState((current) => ({ ...current, density }));

  const setPage = (page: number) =>
    setState((current) => ({ ...current, page: Math.max(1, page) }));

  const setPageSize = (pageSize: number) =>
    setState((current) => ({ ...current, pageSize, page: 1 }));

  const toggleSelectedRow = (rowId: string) =>
    setState((current) => ({
      ...current,
      selectedRowIds: current.selectedRowIds.includes(rowId)
        ? current.selectedRowIds.filter((id) => id !== rowId)
        : [...current.selectedRowIds, rowId],
    }));

  const setSelectedRowIds = (selectedRowIds: string[]) =>
    setState((current) => ({ ...current, selectedRowIds }));

  const clearSelection = () =>
    setState((current) => ({ ...current, selectedRowIds: [] }));

  const setActiveRowId = (activeRowId: string | null) =>
    setState((current) => ({ ...current, activeRowId }));

  const setVisibleColumnKeys = (visibleColumnKeys: string[]) =>
    setState((current) => ({ ...current, visibleColumnKeys }));

  const toggleColumnVisibility = (key: string) =>
    setState((current) => {
      if (current.visibleColumnKeys.length === 0) {
        return { ...current, visibleColumnKeys: [key] };
      }

      return current.visibleColumnKeys.includes(key)
        ? {
            ...current,
            visibleColumnKeys: current.visibleColumnKeys.filter((item) => item !== key),
          }
        : {
            ...current,
            visibleColumnKeys: [...current.visibleColumnKeys, key],
          };
    });

  const resetQuery = () =>
    setState((current) => ({
      ...current,
      search: "",
      filters: initialFilters,
      sort: null,
      groupBy: null,
      page: 1,
      selectedRowIds: [],
      activeRowId: null,
      visibleColumnKeys: initialVisibleColumnKeys,
    }));

  return {
    state,
    setSearch,
    setFilter,
    setSort,
    toggleSort,
    setGroupBy,
    setDensity,
    setPage,
    setPageSize,
    toggleSelectedRow,
    setSelectedRowIds,
    clearSelection,
    setActiveRowId,
    setVisibleColumnKeys,
    toggleColumnVisibility,
    resetQuery,
  };
}
