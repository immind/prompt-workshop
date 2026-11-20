import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { CharCount } from "@/client/components/CharCount";
import { ErrorState } from "@/client/components/ErrorState";
import { LibraryDialog } from "@/client/components/LibraryDialog";
import { NegativePrompt } from "@/client/components/NegativePrompt";
import { PageHeader } from "@/client/components/PageHeader";
import { ResultCard } from "@/client/components/ResultCard";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Textarea } from "@/client/components/ui/textarea";
import { titleFrom } from "@/client/lib/titleFrom";
import {
  ASPECT_RATIOS,
  CAMERA_ANGLES,
  LIGHTING,
  QUALITY_TERMS,
  STYLES,
} from "@/server/options";
import { buildImagePrompt } from "@/serverFunctions/generate";

export const Route = createFileRoute("/image")({
  head: () => ({ meta: [{ title: "Image prompt · Prompt Workshop" }] }),
  component: ImagePage,
});

type Result = Extract<Awaited<ReturnType<typeof buildImagePrompt>>, { ok: true }>["entry"];

function ImagePage() {
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<(typeof STYLES)[number]>("Realistic");
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>("16:9");
  const [camera, setCamera] = useState<(typeof CAMERA_ANGLES)[number]>("Eye level");
  const [lighting, setLighting] = useState<(typeof LIGHTING)[number]>("Natural light");
  const [quality, setQuality] = useState<(typeof QUALITY_TERMS)[number][]>([]);
  const [negative, setNegative] = useState("");
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);

  async function build() {
    setAiError(null);
    const trimmed = description.trim();
    if (!trimmed) return setFieldError({ field: "description", message: "Describe the image." });
    if (trimmed.length > 500)
      return setFieldError({ field: "description", message: "Keep it to 500 characters." });
    if (negative.trim().length > 300)
      return setFieldError({ field: "negative", message: "Keep it to 300 characters." });
    setFieldError(null);
    setPending(true);
    try {
      const outcome = await buildImagePrompt({
        data: { description: trimmed, style, aspectRatio, camera, lighting, quality, negative },
      });
      if (!outcome.ok) {
        if ("field" in outcome && outcome.field)
          setFieldError({ field: outcome.field, message: outcome.error });
        else setAiError(outcome.error);
        return;
      }
      setResult(outcome.entry);
    } catch {
      setAiError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  const errorFor = (field: string) =>
    fieldError?.field === field ? <FieldError>{fieldError.message}</FieldError> : null;
  const negativeShown = String(result?.details.negative ?? "");

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader title="Image prompt" />
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void build();
        }}
      >
        <Field data-invalid={fieldError?.field === "description" ? true : undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="description">Describe the image</FieldLabel>
            <CharCount value={description} max={500} />
          </div>
          <Textarea
            id="description"
            data-testid="image-input"
            rows={3}
            value={description}
            placeholder="A red bicycle leaning on a stone wall in an old town"
            onChange={(event) => setDescription(event.target.value)}
          />
          {errorFor("description")}
        </Field>

        <Field>
          <FieldLabel>Style</FieldLabel>
          <div>
            <SegmentedToggle
              showLabels
              className="flex-wrap"
              value={style}
              onChange={setStyle}
              items={STYLES.map((value) => ({ value, label: value, icon: null }))}
            />
          </div>
          {errorFor("style")}
        </Field>

        <Field>
          <FieldLabel>Aspect ratio</FieldLabel>
          <div>
            <SegmentedToggle
              showLabels
              value={aspectRatio}
              onChange={setAspectRatio}
              items={ASPECT_RATIOS.map((value) => ({ value, label: value, icon: null }))}
            />
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Camera angle</FieldLabel>
            <Select value={camera} onValueChange={(value) => value && setCamera(value)}>
              <SelectTrigger data-testid="camera-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_ANGLES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Lighting</FieldLabel>
            <Select value={lighting} onValueChange={(value) => value && setLighting(value)}>
              <SelectTrigger data-testid="lighting-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIGHTING.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Quality</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {QUALITY_TERMS.map((term) => (
              <Label key={term} className="font-normal">
                <Checkbox
                  checked={quality.includes(term)}
                  onCheckedChange={(checked) =>
                    setQuality((current) =>
                      checked ? [...current, term] : current.filter((item) => item !== term),
                    )
                  }
                />
                {term}
              </Label>
            ))}
          </div>
        </fieldset>

        <Field data-invalid={fieldError?.field === "negative" ? true : undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="negative">Leave out (optional)</FieldLabel>
            <CharCount value={negative} max={300} />
          </div>
          <Input
            id="negative"
            data-testid="negative-input"
            value={negative}
            placeholder="blurry, text, extra fingers"
            onChange={(event) => setNegative(event.target.value)}
          />
          {errorFor("negative")}
        </Field>

        <Button type="submit" data-testid="image-button" pending={pending}>
          Build prompt
        </Button>
      </form>

      {aiError ? (
        <div data-testid="ai-error">
          <ErrorState title="No prompt this time" message={aiError} />
        </div>
      ) : null}

      {result ? (
        <ResultCard
          title="Image prompt"
          output={result.output}
          actions={
            <Button variant="outline" size="sm" onClick={() => setSaving(true)}>
              Save to library
            </Button>
          }
        >
          {negativeShown ? <NegativePrompt value={negativeShown} /> : null}
        </ResultCard>
      ) : null}

      {saving && result ? (
        <LibraryDialog
          draft={{ title: titleFrom(result.input), category: "Image", body: result.output }}
          onClose={() => setSaving(false)}
        />
      ) : null}
    </AppShell>
  );
}
