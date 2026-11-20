import { cn } from "cn";

/** "12/500", in the destructive colour once over the limit. */
export function CharCount({
  value,
  max,
  testId,
}: {
  value: string;
  max: number;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "text-xs tabular-nums text-muted-foreground",
        value.length > max && "text-destructive",
      )}
    >
      {value.length}/{max}
    </span>
  );
}
