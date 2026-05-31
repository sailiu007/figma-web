import * as React from "react";

import { Badge } from "../../ui/badge";
import { cn } from "../../ui/utils";

export function GridStatusCell({
  label,
  tone = "neutral",
}: {
  label: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneClassName = {
    neutral: "border-border/60 bg-background/50 text-foreground",
    success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-300 light:text-emerald-700",
    warning: "border-amber-500/25 bg-amber-500/12 text-amber-300 light:text-amber-700",
    danger: "border-rose-500/25 bg-rose-500/12 text-rose-300 light:text-rose-700",
    info: "border-sky-500/25 bg-sky-500/12 text-sky-300 light:text-sky-700",
  }[tone];

  return <Badge className={cn("rounded-full px-2.5 py-1", toneClassName)}>{label}</Badge>;
}
