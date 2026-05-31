import type { ReactNode } from "react";

export interface RuleValueOption {
    label: string;
    value: string;
}

export function RuleValueControl({
    value,
    value2,
    disabled,
    isRange,
    render,
    onChange,
    onValue2Change,
}: {
    value: string;
    value2?: string;
    disabled?: boolean;
    isRange?: boolean;
    render: (context: {
        value: string;
        value2?: string;
        disabled?: boolean;
        isRange?: boolean;
        onChange: (value: string) => void;
        onValue2Change?: (value: string) => void;
    }) => ReactNode;
    onChange: (value: string) => void;
    onValue2Change?: (value: string) => void;
}) {
    return render({ value, value2, disabled, isRange, onChange, onValue2Change });
}