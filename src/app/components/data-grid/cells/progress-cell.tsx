import { Progress } from "../../ui/progress";

export function GridProgressCell({
  value,
  accent,
}: {
  value: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-1.5 w-24" />
      <span className="text-muted-foreground text-xs font-medium" style={accent ? { color: accent } : undefined}>
        {value}%
      </span>
    </div>
  );
}
