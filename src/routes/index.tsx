import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { CharCount } from "@/client/components/CharCount";
import { ErrorState } from "@/client/components/ErrorState";
import { LibraryDialog } from "@/client/components/LibraryDialog";
import { PageHeader } from "@/client/components/PageHeader";
import { ResultCard } from "@/client/components/ResultCard";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { VersionList } from "@/client/components/VersionList";
import { Button } from "@/client/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import { Textarea } from "@/client/components/ui/textarea";
import { titleFrom } from "@/client/lib/titleFrom";
import { MODES, TARGETS } from "@/server/options";
import { generatePrompt, refinePrompt } from "@/serverFunctions/generate";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Generate · Prompt Workshop" }] }),
  component: GeneratePage,
});

type Mode = (typeof MODES)[number];
type Target = (typeof TARGETS)[number];
type Result = Extract<Awaited<ReturnType<typeof generatePrompt>>, { ok: true }>["entry"];

function GeneratePage() {
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<Mode>("Simple");
  const [target, setTarget] = useState<Target>("Any");
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);

  async function generate() {
    setAiError(null);
    const trimmed = idea.trim();
    if (!trimmed) return setIdeaError("Enter an idea.");
    if (trimmed.length > 500) return setIdeaError("Keep it to 500 characters.");
    setIdeaError(null);
    setPending(true);
    try {
      const outcome = await generatePrompt({ data: { idea: trimmed, mode, target } });
      if (!outcome.ok) {
        if ("field" in outcome && outcome.field) setIdeaError(outcome.error);
        else setAiError(outcome.error);
        return;
      }
      setResult(outcome.entry);
      setSelected(outcome.entry.versions.length - 1);
      setInstruction("");
    } catch {
      setAiError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function refine() {
    if (!result) return;
    const trimmed = instruction.trim();
    if (!trimmed) return setRefineError("Say what to change.");
    if (trimmed.length > 300) return setRefineError("Keep it to 300 characters.");
    setRefineError(null);
    setRefining(true);
    try {
      const outcome = await refinePrompt({ data: { id: result.id, instruction: trimmed } });
      if (!outcome.ok) return setRefineError(outcome.error);
      setResult(outcome.entry);
      setSelected(outcome.entry.versions.length - 1);
      setInstruction("");
    } catch {
      setRefineError("Something went wrong. Try again.");
    } finally {
      setRefining(false);
    }
  }

  const shown = result?.versions[selected]?.output ?? result?.output ?? "";

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader title="Generate a prompt" />

      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
      >
        <Field data-invalid={ideaError ? true : undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="idea">Your idea</FieldLabel>
            <CharCount value={idea} max={500} testId="idea-counter" />
          </div>
          <Textarea
            id="idea"
            data-testid="idea-input"
            value={idea}
            rows={4}
            aria-invalid={ideaError ? true : undefined}
            placeholder="A weekly newsletter for a neighbourhood bakery"
            onChange={(event) => setIdea(event.target.value)}
          />
          {ideaError ? <FieldError data-testid="idea-error">{ideaError}</FieldError> : null}
        </Field>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Field className="w-auto">
            <FieldLabel>Mode</FieldLabel>
            <SegmentedToggle
              showLabels
              value={mode}
              onChange={setMode}
              items={MODES.map((value) => ({ value, label: value, icon: null }))}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel>For</FieldLabel>
            <SegmentedToggle
              showLabels
              className="flex-wrap"
              value={target}
              onChange={setTarget}
              items={TARGETS.map((value) => ({ value, label: value, icon: null }))}
            />
          </Field>
        </div>

        <Button type="submit" data-testid="generate-button" pending={pending}>
          Generate
        </Button>
      </form>

      {aiError ? (
        <div data-testid="ai-error">
          <ErrorState title="No prompt this time" message={aiError} />
        </div>
      ) : null}

      {result ? (
        <ResultCard
          title="Your prompt"
          output={shown}
          actions={
            <Button
              variant="outline"
              size="sm"
              data-testid="save-to-library"
              onClick={() => setSaving(true)}
            >
              Save to library
            </Button>
          }
        >
          <VersionList versions={result.versions} selected={selected} onSelect={setSelected} />
          <form
            className="space-y-2"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void refine();
            }}
          >
            <Field data-invalid={refineError ? true : undefined}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="refine">Refine</FieldLabel>
                <CharCount value={instruction} max={300} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Textarea
                  id="refine"
                  data-testid="refine-input"
                  rows={2}
                  value={instruction}
                  placeholder="Make it shorter"
                  onChange={(event) => setInstruction(event.target.value)}
                />
                <Button type="submit" variant="secondary" data-testid="refine-button" pending={refining}>
                  Refine
                </Button>
              </div>
              {refineError ? <FieldError>{refineError}</FieldError> : null}
            </Field>
          </form>
        </ResultCard>
      ) : null}

      {saving && result ? (
        <LibraryDialog
          draft={{ title: titleFrom(result.input), category: "Other", body: shown }}
          onClose={() => setSaving(false)}
        />
      ) : null}
    </AppShell>
  );
}
