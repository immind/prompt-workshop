import type { ReactNode } from "react";
import { CopyButton } from "@/client/components/CopyButton";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

/** A finished prompt with a copy button, and room for more actions and detail. */
export function ResultCard({
  title,
  output,
  actions,
  children,
}: {
  title: string;
  output: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className="flex flex-wrap gap-2">
          {actions}
          <CopyButton value={output} successMessage="Copied." size="sm" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <p
          data-testid="result-output"
          className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap break-words"
        >
          {output}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}
