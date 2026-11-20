import { CircleAlert, CircleCheck } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/client/components/ui/card";

interface Details {
  level?: unknown;
  score?: unknown;
  strengths?: unknown;
  problems?: unknown;
}

/** A prompt review: its level and score, what works and what doesn't. */
export function CheckReport({ details }: { details: Details }) {
  const strengths = Array.isArray(details.strengths) ? (details.strengths as string[]) : [];
  const problems = Array.isArray(details.problems)
    ? (details.problems as { problem: string; impact: string }[])
    : [];
  const level = String(details.level ?? "");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Badge
            data-testid="check-level"
            variant={level === "Weak" ? "destructive" : level === "Fair" ? "secondary" : "default"}
          >
            {level}
          </Badge>
          <span data-testid="check-score" className="tabular-nums">
            {String(details.score ?? "")}/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Strengths</h3>
          {strengths.length ? (
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} data-testid="check-strength" className="flex gap-2 text-sm">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  {strength}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None found.</p>
          )}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Problems</h3>
          {problems.length ? (
            <ul className="space-y-3">
              {problems.map((item, index) => (
                <li key={index} data-testid="check-problem" className="flex gap-2 text-sm">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  <div>
                    <p className="font-medium">{item.problem}</p>
                    <p className="text-muted-foreground">{item.impact}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None found.</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
