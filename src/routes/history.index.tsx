import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppNav } from "@/client/components/AppNav";
import { AppShell } from "@/client/components/AppShell";
import { EmptyState } from "@/client/components/EmptyState";
import { PageHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { formatWhen, KIND_FILTERS, KIND_LABELS } from "@/client/lib/kinds";
import { KINDS } from "@/server/options";
import { getHistory } from "@/serverFunctions/history";

export const Route = createFileRoute("/history/")({
  validateSearch: z.object({ kind: z.enum(KINDS).optional().catch(undefined) }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getHistory({ data: deps }),
  head: () => ({ meta: [{ title: "History · Prompt Workshop" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const items = Route.useLoaderData();
  const { kind } = Route.useSearch();
  const navigate = useNavigate({ from: "/history/" });

  return (
    <AppShell nav={<AppNav />}>
      <PageHeader
        title="History"
        actions={
          <Select
            value={kind ?? "all"}
            onValueChange={(value) =>
              void navigate({
                search: { kind: value && value !== "all" ? (value as (typeof KINDS)[number]) : undefined },
                replace: true,
              })
            }
            items={KIND_FILTERS}
          >
            <SelectTrigger data-testid="kind-filter" className="w-44" aria-label="Kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          kind={kind ? "filtered" : "no-data"}
          title={kind ? "Nothing of this kind yet" : "Nothing saved yet"}
          description={kind ? undefined : "Every prompt you generate, check or build is kept here."}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to="/history/$id"
                params={{ id: item.id }}
                data-testid="history-item"
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
              >
                {item.hasImage ? (
                  <img
                    src={`/images/${item.id}`}
                    alt=""
                    className="size-12 shrink-0 rounded-md border border-border object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{KIND_LABELS[item.kind]}</Badge>
                    <span>{formatWhen(item.createdAt)}</span>
                  </div>
                  <p className="truncate text-sm font-medium">{item.input}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.output}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
