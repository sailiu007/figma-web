import { Plus } from "lucide-react";

import { Button } from "../../ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { cn } from "../../ui/utils";

export interface DataGridViewItem {
    key: string;
    label: string;
    count?: number;
}

export function GridViewBar({
    title,
    description,
    views,
    activeViewKey,
    onViewChange,
}: {
    title?: string;
    description?: string;
    views?: DataGridViewItem[];
    activeViewKey?: string;
    onViewChange?: (key: string) => void;
}) {
    return (
        <div className="glass-soft rounded-[28px] border border-border/60 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    {title && <div className="text-base font-semibold">{title}</div>}
                    {description && <div className="text-muted-foreground mt-1 text-sm">{description}</div>}
                </div>
                <Button variant="outline" size="sm" className="rounded-full border-border/60 bg-background/35 px-3">
                    <Plus className="size-4" />
                    新建视图
                </Button>
            </div>

            {views && views.length > 0 && activeViewKey && onViewChange && (
                <Tabs value={activeViewKey} onValueChange={onViewChange} className="gap-0">
                    <TabsList className="h-auto flex-wrap rounded-2xl border border-border/60 bg-background/25 p-1">
                        {views.map((view) => (
                            <TabsTrigger
                                key={view.key}
                                value={view.key}
                                className={cn(
                                    "rounded-2xl px-3 py-2 text-sm",
                                    "data-[state=active]:bg-background/80 data-[state=active]:shadow-none",
                                )}
                            >
                                <span>{view.label}</span>
                                {typeof view.count === "number" && (
                                    <span className="rounded-full bg-background/55 px-2 py-0.5 text-[11px] font-semibold">
                                        {view.count}
                                    </span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            )}
        </div>
    );
}
