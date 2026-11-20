import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { CopyButton } from "@/client/components/CopyButton";
import { EmptyState } from "@/client/components/EmptyState";
import { LibraryDialog, type LibraryDraft } from "@/client/components/LibraryDialog";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { CATEGORIES } from "@/server/options";
import { getLibrary, removeLibraryPrompt } from "@/serverFunctions/library";

const search = z.object({
  category: z.enum(CATEGORIES).optional().catch(undefined),
  q: z.string().max(200).optional().catch(undefined),
});

export const Route = createFileRoute("/library")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getLibrary({ data: deps }),
  head: () => ({ meta: [{ title: "Library · Prompt Workshop" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const prompts = Route.useLoaderData();
  const { category, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/library" });
  const router = useRouter();
  const [text, setText] = useState(q ?? "");
  const [editing, setEditing] = useState<LibraryDraft | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const [pending, setPending] = useState(false);

  function setSearch(next: { category?: (typeof CATEGORIES)[number]; q?: string }) {
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  }

  async function remove() {
    if (!deleting) return;
    setPending(true);
    try {
      const { deleted } = await removeLibraryPrompt({ data: { id: deleting.id } });
      if (deleted) toast.success("Deleted.");
      else toast.error("That prompt couldn't be deleted.");
      await router.invalidate();
    } catch {
      toast.error("That prompt couldn't be deleted.");
    } finally {
      setPending(false);
      setDeleting(null);
    }
  }

  const filtered = Boolean(category || q);

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title="Library"
        actions={
          <Button
            data-testid="library-add"
            onClick={() => setEditing({ title: "", category: "Other", body: "" })}
          >
            <Plus data-icon="inline-start" aria-hidden />
            Add prompt
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            data-testid="library-search"
            aria-label="Search"
            placeholder="Search"
            className="pl-9"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setSearch({ q: event.target.value.trim() || undefined });
            }}
          />
        </div>
        <Select
          value={category ?? "All"}
          onValueChange={(value) =>
            setSearch({ category: value && value !== "All" ? (value as (typeof CATEGORIES)[number]) : undefined })
          }
        >
          <SelectTrigger data-testid="category-filter" className="w-full sm:w-44" aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["All", ...CATEGORIES].map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {prompts.length === 0 ? (
        <EmptyState
          kind={filtered ? "filtered" : "no-data"}
          title={filtered ? "No matching prompts" : "No prompts yet"}
          description={filtered ? undefined : "Add one and it will appear here for everyone."}
        />
      ) : (
        <ul className="space-y-3">
          {prompts.map((prompt) => (
            <li key={prompt.id} data-testid="library-item" data-id={prompt.id}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle data-testid="library-item-title">{prompt.title}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2">
                    <Badge variant="soft" data-testid="library-item-category">
                      {prompt.category}
                    </Badge>
                    <span>{prompt.author ?? "Included with the app"}</span>
                  </CardDescription>
                  <CardAction className="flex gap-1">
                    <CopyButton value={prompt.body} successMessage="Copied." size="icon-sm" variant="ghost" />
                    {prompt.canEdit ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit prompt"
                        data-testid="library-edit"
                        onClick={() =>
                          setEditing({
                            id: prompt.id,
                            title: prompt.title,
                            category: prompt.category as (typeof CATEGORIES)[number],
                            body: prompt.body,
                          })
                        }
                      >
                        <Pencil aria-hidden />
                      </Button>
                    ) : null}
                    {prompt.canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete prompt"
                        data-testid="library-delete"
                        onClick={() => setDeleting({ id: prompt.id, title: prompt.title })}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">{prompt.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <LibraryDialog
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={() => void router.invalidate()}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title={`Delete "${deleting.title}"?`}
          confirmLabel="Delete"
          destructive
          pending={pending}
          onConfirm={() => void remove()}
          onClose={() => setDeleting(null)}
        >
          It is removed from the library for everyone.
        </ConfirmDialog>
      ) : null}
    </AppShell>
  );
}
