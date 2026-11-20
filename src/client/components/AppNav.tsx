import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

const LINKS = [
  { to: "/", label: "Generate" },
  { to: "/check", label: "Check" },
  { to: "/image", label: "Image" },
  { to: "/image-to-prompt", label: "From image" },
  { to: "/library", label: "Library" },
  { to: "/history", label: "History" },
] as const;

const LINK =
  "text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:font-medium data-[status=active]:text-foreground";

/** The app's pages: links on wide screens, a menu on narrow ones. */
export function AppNav() {
  return (
    <>
      <nav className="hidden items-center gap-4 lg:flex">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={LINK}
            activeOptions={{ exact: link.to === "/" }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" aria-label="Pages">
                <Menu aria-hidden />
                Pages
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            {LINKS.map((link) => (
              <DropdownMenuItem key={link.to} render={<Link to={link.to} />}>
                {link.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
