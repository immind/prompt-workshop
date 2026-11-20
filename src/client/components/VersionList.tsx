import { cn } from "cn";

export interface VersionView {
  output: string;
  instruction: string | null;
}

/** Every version of a generated prompt; picking one shows it. */
export function VersionList({
  versions,
  selected,
  onSelect,
}: {
  versions: VersionView[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  if (versions.length < 2) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Versions</h3>
      <ol className="space-y-1">
        {versions.map((version, index) => (
          <li key={index}>
            <button
              type="button"
              data-testid="version-item"
              aria-pressed={index === selected}
              onClick={() => onSelect(index)}
              className={cn(
                "w-full cursor-pointer rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                index === selected && "border-primary bg-primary/5",
              )}
            >
              <span className="font-medium">Version {index + 1}</span>
              <span className="text-muted-foreground">
                {" · "}
                {version.instruction ?? "Original"}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
