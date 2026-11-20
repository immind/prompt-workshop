import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { ErrorState } from "@/client/components/ErrorState";
import { LibraryDialog } from "@/client/components/LibraryDialog";
import { PageHeader } from "@/client/components/PageHeader";
import { ResultCard } from "@/client/components/ResultCard";
import { Button } from "@/client/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { titleFrom } from "@/client/lib/titleFrom";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/server/options";
import { describeImage } from "@/serverFunctions/imageToPrompt";

export const Route = createFileRoute("/image-to-prompt")({
  head: () => ({ meta: [{ title: "From image · Prompt Workshop" }] }),
  component: ImageToPromptPage,
});

type Result = Extract<Awaited<ReturnType<typeof describeImage>>, { ok: true }>["entry"];

function problemWith(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "Use a JPG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Use an image of up to 5 MB.";
  return null;
}

function ImageToPromptPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);

  async function describe() {
    setAiError(null);
    if (!file) return setFileError("Choose an image.");
    const problem = problemWith(file);
    if (problem) return setFileError(problem);
    setPending(true);
    try {
      const form = new FormData();
      form.set("image", file);
      const outcome = await describeImage({ data: form });
      if (!outcome.ok) return setAiError(outcome.error);
      setResult(outcome.entry);
    } catch {
      setAiError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader title="Prompt from an image" />
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void describe();
        }}
      >
        <Field data-invalid={fileError ? true : undefined}>
          <FieldLabel htmlFor="image">Image</FieldLabel>
          <Input
            id="image"
            type="file"
            data-testid="image-file"
            accept={IMAGE_TYPES.join(",")}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setFile(chosen);
              setFileError(chosen ? problemWith(chosen) : null);
            }}
          />
          <FieldDescription>JPG, PNG or WebP, up to 5 MB.</FieldDescription>
          {fileError ? <FieldError data-testid="file-error">{fileError}</FieldError> : null}
        </Field>
        <Button type="submit" data-testid="describe-button" pending={pending}>
          Write prompt
        </Button>
      </form>

      {aiError ? (
        <div data-testid="ai-error">
          <ErrorState title="No prompt this time" message={aiError} />
        </div>
      ) : null}

      {result ? (
        <ResultCard
          title="Prompt"
          output={result.output}
          actions={
            <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
              Save to library
            </Button>
          }
        >
          <img
            data-testid="image-thumb"
            src={`/images/${result.id}`}
            alt={result.input}
            className="max-h-48 rounded-lg border border-border object-contain"
          />
        </ResultCard>
      ) : null}

      {saving && result ? (
        <LibraryDialog
          draft={{ title: titleFrom(result.output), category: "Image", body: result.output }}
          onClose={() => setSaving(false)}
        />
      ) : null}
    </AppShell>
  );
}
