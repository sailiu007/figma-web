export function GridAvatarStackCell({
  count,
  colors,
}: {
  count: number;
  colors: string[];
}) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: Math.min(count, 4) }).map((_, index) => (
        <div
          key={index}
          className="flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold text-white"
          style={{ background: colors[index % colors.length], borderColor: "rgba(20,20,40,.95)" }}
        >
          {String.fromCharCode(65 + index)}
        </div>
      ))}
      {count > 4 && (
        <div className="glass-soft flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold" style={{ borderColor: "rgba(20,20,40,.95)" }}>
          +{count - 4}
        </div>
      )}
    </div>
  );
}
