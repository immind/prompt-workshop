import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { Textarea } from "@/client/components/ui/textarea";
import { CATEGORIES } from "@/server/options";
import { addLibraryPrompt, editLibraryPrompt } from "@/serverFunctions/library";

type Category = (typeof CATEGORIES)[number];

export interface LibraryDraft {
  id?: string;
  title: string;
  category: Category;
  body: string;
}

/** Adds a prompt to the library, or edits one the member wrote. */
export function LibraryDialog({
  draft,
  onClose,
  onSaved,
}: {
  draft: LibraryDraft;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [category, setCategory] = useState<Category>(draft.category);
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const data = { title, category, body };
      const result = draft.id
        ? await editLibraryPrompt({ data: { id: draft.id, ...data } })
        : await addLibraryPrompt({ data });
      if (!result.ok) {
        setError({ field: "field" in result ? result.field : undefined, message: result.error });
        return;
      }
      toast.success(draft.id ? "Saved." : "Added to the library.");
      onSaved?.();
      onClose();
    } catch {
      setError({ message: "That didn't save. Try again." });
    } finally {
      setPending(false);
    }
  }

  const errorFor = (field: string) =>
    error && (error.field === field || (!error.field && field === "body")) ? (
      <FieldError>{error.message}</FieldError>
    ) : null;

  return (
    <FormDialog
      title={draft.id ? "Edit prompt" : "Add to library"}
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button data-testid="library-save" pending={pending} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel htmlFor="library-title">Title</FieldLabel>
          <Input
            id="library-title"
            data-testid="library-title"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
          />
          {errorFor("title")}
        </Field>
        <Field>
          <FieldLabel>Category</FieldLabel>
          <Select value={category} onValueChange={(value) => value && setCategory(value as Category)}>
            <SelectTrigger data-testid="library-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="library-body">Prompt</FieldLabel>
          <Textarea
            id="library-body"
            data-testid="library-body"
            value={body}
            rows={8}
            onChange={(event) => setBody(event.target.value)}
          />
          {errorFor("body")}
        </Field>
      </div>
    </FormDialog>
  );
}
