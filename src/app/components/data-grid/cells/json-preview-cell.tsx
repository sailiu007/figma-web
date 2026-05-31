export function GridJsonPreviewCell({ value }: { value: unknown }) {
  return (
    <pre className="bg-background/35 max-w-[320px] overflow-hidden rounded-2xl border border-border/60 px-3 py-2 text-xs whitespace-pre-wrap text-muted-foreground">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
