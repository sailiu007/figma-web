import * as React from "react";

export function PanelShell({
    title,
    description,
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            {(title || description) && (
                <div className="border-b border-border/60 px-4 pb-2.5 pt-1">
                    {title && <div className="text-base font-semibold leading-5">{title}</div>}
                    {description && <div className="text-muted-foreground mt-1 text-xs">{description}</div>}
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
}
