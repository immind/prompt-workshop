import { CopyButton } from "@/client/components/CopyButton";

/** The negative prompt, kept apart from the main one. */
export function NegativePrompt({ value }: { value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Negative prompt</h3>
        <CopyButton value={value} successMessage="Copied." label="Copy negative" />
      </div>
      <p data-testid="negative-output" className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}
