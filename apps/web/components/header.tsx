import Link from "next/link";
import { ArrowUpRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Header() {
  return (
    <header className="border-b border-border">
      <div className="shell flex h-20 items-center justify-between gap-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold tracking-tight"
        >
          <Ticket className="text-primary" size={28} />
          GatherOS<span className="text-primary">.</span>
        </Link>
        <nav className="flex items-center gap-7 text-sm">
          <Link href="/explore#discover" className="desktop-only">
            Discover events
          </Link>
          <Link href="/about" className="desktop-only">
            Our story
          </Link>
          <Link href="/my-tickets" className="desktop-only">
            My tickets
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              For organizers <ArrowUpRight size={15} />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
