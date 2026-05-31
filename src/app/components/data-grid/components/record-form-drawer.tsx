import { Button } from "../../ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "../../ui/drawer";
import type { ResolvedFieldDefinition } from "../field-behavior";
import { FieldEditorControl } from "./field-editor-control";

export function RecordFormDrawer({
    open,
    onOpenChange,
    title,
    description,
    fields,
    draft,
    errors,
    submitLabel,
    onFieldChange,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    fields: ResolvedFieldDefinition[];
    draft: Record<string, string>;
    errors: Record<string, string>;
    submitLabel: string;
    onFieldChange: (fieldKey: string, value: string) => void;
    onSubmit: () => void;
}) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange} direction="right">
            <DrawerContent className="glass-strong h-full w-[min(560px,100vw)] border-l border-border/60 bg-popover/95 p-0 sm:max-w-none">
                <DrawerHeader className="border-b border-border/60 px-6 py-5">
                    <DrawerTitle>{title}</DrawerTitle>
                    {description ? <DrawerDescription>{description}</DrawerDescription> : null}
                </DrawerHeader>
                <div className="flex h-full flex-col overflow-hidden">
                    <div className="flex-1 space-y-5 overflow-auto px-6 py-5">
                        {fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                                    <span>{field.label}</span>
                                    {field.required ? <span className="text-destructive">*</span> : null}
                                </div>
                                {field.description ? <div className="text-xs text-muted-foreground">{field.description}</div> : null}
                                <FieldEditorControl
                                    field={field}
                                    value={draft[field.key] ?? field.initialValue}
                                    onChange={(value) => onFieldChange(field.key, value)}
                                />
                                {errors[field.key] ? <div className="text-xs text-destructive">{errors[field.key]}</div> : null}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4">
                        <Button variant="ghost" size="sm" className="h-9 rounded-xl px-4" onClick={() => onOpenChange(false)}>
                            取消
                        </Button>
                        <Button size="sm" className="h-9 rounded-xl px-4" onClick={onSubmit}>
                            {submitLabel}
                        </Button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}