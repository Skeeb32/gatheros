import Link from "next/link";
import { dashboardData } from "@/lib/dashboard";
import { EventTable } from "@/components/dashboard/event-table";
import { Button } from "@/components/ui/button";
export default async function Events() {
  const { events } = await dashboardData();
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="serif text-5xl">Your events.</h1>
        <Button asChild>
          <Link href="/dashboard/events/new">Create event</Link>
        </Button>
      </div>
      <EventTable events={events} />
    </>
  );
}
