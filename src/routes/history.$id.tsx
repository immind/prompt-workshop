import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { CheckReport } from "@/client/components/CheckReport";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { EmptyState } from "@/client/components/EmptyState";
import { NegativePrompt } from "@/client/components/NegativePrompt";
import { PageHeader } from "@/client/components/PageHeader";
import { ResultCard } from "@/client/components/ResultCard";
import { VersionList } from "@/client/components/VersionList";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";
import { formatWhen, KIND_LABELS } from "@/client/lib/kinds";
import { deleteHistoryEntry, getHistoryEntry } from "@/serverFunctions/history";

export const Route = createFileRoute("/history/$id")({
  loader: ({ params }) => getHistoryEntry({ data: { id: params.id } }),
  head: () => ({ meta: [{ title: "History · Prompt Workshop" }] }),
  component: EntryPage,
});

const BACK =
  "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground";

function BackToHistory() {
  return (
    <Link to="/history" className={BACK}>
      <ChevronLeft className="size-4" aria-hidden />
      History
    </Link>
  );
}

const OPTION_LABELS: Record<string, string> = {
  mode: "Mode",
  target: "For",
  style: "Style",
  aspectRatio: "Aspect ratio",
  camera: "Camera angle",
  lighting: "Lighting",
  quality: "Quality",
};

function EntryPage() {
  const entry = Route.useLoaderData();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(entry ? entry.versions.length - 1 : 0);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!entry) {
    return (
      <AppShell nav={<AppNav />}>
        <PageHeader title="History" backLink={<BackToHistory />} />
        <div data-testid="history-missing">
          <EmptyState kind="filtered" title="Entry not found" />
        </div>
      </AppShell>
    );
  }

  async function remove() {
    if (!entry) return;
    setPending(true);
    try {
      await deleteHistoryEntry({ data: { id: entry.id } });
      toast.success("Deleted.");
      await navigate({ to: "/history" });
    } catch {
      toast.error("That entry couldn't be deleted.");
      setPending(false);
      setConfirming(false);
    }
  }

  const options = Object.entries(entry.options).filter(([key]) => key in OPTION_LABELS);
  const output = entry.versions[selected]?.output ?? entry.output;
  const negative = String(entry.details.negative ?? "");

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title={KIND_LABELS[entry.kind]}
        description={formatWhen(entry.createdAt)}
        backLink={<BackToHistory />}
        actions={
          <Button variant="outline" data-testid="history-delete" onClick={() => setConfirming(true)}>
            <Trash2 data-icon="inline-start" aria-hidden />
            Delete entry
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{entry.kind === "image_to_prompt" ? "Image" : "Input"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entry.hasImage ? (
            <img
              src={`/images/${entry.id}`}
              alt={entry.input}
              className="max-h-48 rounded-lg border border-border object-contain"
            />
          ) : null}
          <p data-testid="history-input" className="text-sm whitespace-pre-wrap break-words">
            {entry.input}
          </p>
          {options.length ? (
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {options.map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <dt className="text-muted-foreground">{OPTION_LABELS[key]}</dt>
                  <dd>{Array.isArray(value) ? value.join(", ") || "None" : String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </CardContent>
      </Card>

      {entry.kind === "check" ? <CheckReport details={entry.details} /> : null}

      <ResultCard title={entry.kind === "check" ? "Improved prompt" : "Prompt"} output={output}>
        <VersionList versions={entry.versions} selected={selected} onSelect={setSelected} />
        {negative ? <NegativePrompt value={negative} /> : null}
      </ResultCard>

      {confirming ? (
        <ConfirmDialog
          title="Delete this entry?"
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={() => void remove()}
          onClose={() => setConfirming(false)}
        >
          {entry.hasImage ? "Its image is deleted too." : undefined}
        </ConfirmDialog>
      ) : null}
    </AppShell>
  );
}
