import { notFound, redirect } from "next/navigation";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { operations } from "@/lib/ops/data";
import { WaitlistForm } from "@/components/waitlist-form";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (configured()) {
    const db = await serverClient();
    const { data } = await db
      .from("events")
      .select("slug,organizers(slug)")
      .eq("slug", slug)
      .eq("status", "published");
    if (data?.length !== 1) notFound();
    const org = data[0].organizers as unknown as { slug: string };
    redirect(`/e/${org.slug}/${slug}`);
  }
  const data = await operations();
  if (slug !== data.event.slug) notFound();
  return (
    <main className="shell py-12">
      <p className="eyebrow mb-4">FIELDWORK COLLECTIVE · LOCAL DEMO</p>
      <div className="rounded-2xl bg-[#dce8c4] p-12 mb-10">
        <p className="serif text-8xl mb-5">F/F</p>
        <h1 className="serif text-5xl">{data.event.title}</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-14">
        <section>
          <h2 className="serif text-3xl mb-5">
            A gathering for what comes next.
          </h2>
          <p className="muted leading-8">{data.event.description}</p>
          <p className="mt-6">
            {data.event.venue_name} · {data.event.city}
          </p>
          <p>
            {new Date(data.event.starts_at).toLocaleDateString("en-US", {
              dateStyle: "full",
              timeZone: "UTC",
            })}
          </p>
        </section>
        <aside className="panel">
          <h2 className="serif text-2xl mb-4">Find your place.</h2>
          {data.inventory.map((t) => (
            <div key={t.id} className="flex justify-between py-3 border-b">
              <span>
                {t.name}
                <small className="block muted">
                  {t.quantity - t.quantity_sold - t.quantity_reserved} available
                </small>
              </span>
              <b>${t.price_cents / 100}</b>
            </div>
          ))}
          <p className="text-xs muted mt-5">
            Payments require connected Supabase and Stripe accounts. This local
            preview accepts waitlist registrations.
          </p>
          <WaitlistForm eventId={data.event.id} />
        </aside>
      </div>
    </main>
  );
}
