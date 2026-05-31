import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import type { ResolvedFieldDefinition } from "../field-behavior";

export function FieldEditorControl({
    field,
    value,
    disabled,
    onChange,
}: {
    field: ResolvedFieldDefinition;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}) {
    return field.renderEditor({ value, disabled, onChange });
}