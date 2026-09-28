import { dashboardData } from "@/lib/dashboard";
import { EventForm } from "@/components/dashboard/event-form";
export default async function NewEvent() {
  const { organizers } = await dashboardData();
  return (
    <>
      <h1 className="serif text-5xl mb-8">Start something good.</h1>
      <EventForm organizers={organizers.filter((o) => o.role !== "staff")} />
    </>
  );
}
