import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Settings,
  Ticket,
  ArrowUpRight,
} from "lucide-react";
import { redirect } from "next/navigation";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (configured()) {
    const db = await serverClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) redirect("/login");
  }
  return (
    <div className="dash-grid">
      <aside className="dash-nav">
        <p className="eyebrow muted px-4 mb-6 desktop-only">
          Organizer workspace
        </p>
        <Link href="/operations">
          <LayoutDashboard size={17} />
          Operations copilot
        </Link>
        <Link href="/dashboard">
          <LayoutDashboard size={17} />
          Overview
        </Link>
        <Link href="/dashboard/events">
          <CalendarDays size={17} />
          Events
        </Link>
        <Link href="/my-tickets">
          <Ticket size={17} />
          My tickets
        </Link>
        <Link href="/dashboard/settings">
          <Settings size={17} />
          Settings
        </Link>
        <Link href="/">
          <ArrowUpRight size={17} />
          View marketplace
        </Link>
      </aside>
      <main className="dash-main">
        {!configured() && (
          <p className="notice mb-7">
            Demo workspace · sample data. Configure your services to save
            changes and accept payments.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
