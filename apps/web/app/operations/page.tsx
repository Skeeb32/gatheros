import { operations } from "@/lib/ops/data";
import { OperationsWorkspace } from "@/components/operations-workspace";
import { configured } from "@/lib/config";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  try {
    const data = await operations((await searchParams).event);
    return <OperationsWorkspace initial={data} demo={!configured()} />;
  } catch (error) {
    console.error(
      "Operations load failed",
      error instanceof Error ? error.message : "unknown",
    );
    return (
      <main className="shell py-20">
        <h1 className="text-4xl">Your event command center</h1>
        <p className="my-6">
          Sign in and create an event to open your operations workspace.
        </p>
        <Link className="btn" href="/dashboard/events/new">
          Create an event
        </Link>
      </main>
    );
  }
}
