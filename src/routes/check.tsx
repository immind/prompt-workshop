import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { CharCount } from "@/client/components/CharCount";
import { CheckReport } from "@/client/components/CheckReport";
import { ErrorState } from "@/client/components/ErrorState";
import { LibraryDialog } from "@/client/components/LibraryDialog";
import { PageHeader } from "@/client/components/PageHeader";
import { ResultCard } from "@/client/components/ResultCard";
import { Button } from "@/client/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import { Textarea } from "@/client/components/ui/textarea";
import { titleFrom } from "@/client/lib/titleFrom";
import { checkPrompt } from "@/serverFunctions/generate";

export const Route = createFileRoute("/check")({
  head: () => ({ meta: [{ title: "Check · Prompt Workshop" }] }),
  component: CheckPage,
});

type Result = Extract<Awaited<ReturnType<typeof checkPrompt>>, { ok: true }>["entry"];

function CheckPage() {
  const [prompt, setPrompt] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);

  async function check() {
    setAiError(null);
    const trimmed = prompt.trim();
    if (!trimmed) return setFieldError("Enter a prompt.");
    if (trimmed.length > 500) return setFieldError("Keep it to 500 characters.");
    setFieldError(null);
    setPending(true);
    try {
      const outcome = await checkPrompt({ data: { prompt: trimmed } });
      if (!outcome.ok) {
        if ("field" in outcome && outcome.field) setFieldError(outcome.error);
        else setAiError(outcome.error);
        setResult(null);
        return;
      }
      setResult(outcome.entry);
    } catch {
      setAiError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader title="Check a prompt" />
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void check();
        }}
      >
        <Field data-invalid={fieldError ? true : undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="prompt">Prompt</FieldLabel>
            <CharCount value={prompt} max={500} />
          </div>
          <Textarea
            id="prompt"
            data-testid="check-input"
            rows={5}
            value={prompt}
            aria-invalid={fieldError ? true : undefined}
            onChange={(event) => setPrompt(event.target.value)}
          />
          {fieldError ? <FieldError>{fieldError}</FieldError> : null}
        </Field>
        <Button type="submit" data-testid="check-button" pending={pending}>
          Check
        </Button>
      </form>

      {aiError ? (
        <div data-testid="ai-error">
          <ErrorState title="No review this time" message={aiError} />
        </div>
      ) : null}

      {result ? (
        <>
          <CheckReport details={result.details} />
          <ResultCard
            title="Improved prompt"
            output={result.output}
            actions={
              <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
                Save to library
              </Button>
            }
          />
        </>
      ) : null}

      {saving && result ? (
        <LibraryDialog
          draft={{ title: titleFrom(result.input), category: "Other", body: result.output }}
          onClose={() => setSaving(false)}
        />
      ) : null}
    </AppShell>
  );
}
