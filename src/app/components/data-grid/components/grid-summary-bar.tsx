import * as React from "react";

export interface DataGridSummaryItem {
    label: string;
    value: React.ReactNode;
}

export function GridSummaryBar({
    selectedCount,
    totalCount,
    pageCount,
    page,
    pageSizeOptions,
    pageSize,
    onPageSizeChange,
    onPrevPage,
    onNextPage,
    items,
}: {
    selectedCount: number;
    totalCount: number;
    pageCount: number;
    page: number;
    pageSizeOptions: number[];
    pageSize: number;
    onPageSizeChange: (value: number) => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    items?: DataGridSummaryItem[];
}) {
    return (
        <div className="glass-soft flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-border/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
                <SummaryPill label="总记录" value={totalCount} />
                <SummaryPill label="已选" value={selectedCount} />
                {items?.map((item) => (
                    <SummaryPill key={item.label} label={item.label} value={item.value} />
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/30 p-1">
                    {pageSizeOptions.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onPageSizeChange(option)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${pageSize === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {option}/页
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/30 p-1">
                    <button type="button" onClick={onPrevPage} disabled={page <= 1} className="rounded-full px-3 py-1.5 text-sm disabled:opacity-40">
                        上一页
                    </button>
                    <div className="px-3 text-sm font-medium">{page} / {pageCount}</div>
                    <button type="button" onClick={onNextPage} disabled={page >= pageCount} className="rounded-full px-3 py-1.5 text-sm disabled:opacity-40">
                        下一页
                    </button>
                </div>
            </div>
        </div>
    );
}

function SummaryPill({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-full border border-border/60 bg-background/35 px-3 py-1.5 text-xs">
            <span className="text-muted-foreground mr-2">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
