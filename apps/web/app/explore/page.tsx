import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { getEvents } from "@/lib/events";
import { configured } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { EventArt } from "@/components/events/art";
import { Discovery } from "@/components/events/discovery";
export const dynamic = "force-dynamic";
export default async function Home() {
  const events = await getEvents();
  return (
    <main>
      {!configured() && (
        <div className="bg-[#ecefe4] text-center py-2 text-[11px] tracking-wide">
          You’re exploring the GatherOS demo. Sample events · no real purchases.
        </div>
      )}
      <section className="shell grid md:grid-cols-[1.05fr_1fr] items-center gap-12 pt-12 pb-14 md:pt-18">
        <div>
          <p className="eyebrow text-primary flex items-center gap-2 mb-6">
            <span className="w-5 h-px bg-primary" />
            Less scrolling. More showing up.
          </p>
          <h1 className="serif text-[56px] md:text-[78px] leading-[1.02]">
            Good things
            <br />
            happen <em className="text-primary font-normal">together.</em>
          </h1>
          <p className="muted text-base leading-7 max-w-sm mt-6">
            The nights you talk about. The people you meet. Discover experiences
            worth stepping out for.
          </p>
          <Button asChild size="lg" className="mt-8">
            <a href="#discover">
              Find your people <ArrowRight size={16} />
            </a>
          </Button>
          <div className="flex items-center gap-3 mt-9 text-xs muted">
            <div className="flex -space-x-2">
              {["#c1c9ad", "#d9b28d", "#a7b9b3"].map((c, i) => (
                <span
                  key={c}
                  className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] text-foreground"
                  style={{ background: c }}
                >
                  {["S", "J", "M"][i]}
                </span>
              ))}
            </div>
            Made for real-life connections.
          </div>
        </div>
        <div className="relative pb-5">
          <EventArt className="h-[390px] md:h-[470px] rounded-t-[180px] rounded-b-2xl" />
          <div className="absolute -bottom-1 left-5 right-5 bg-background border border-border rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="eyebrow !text-[9px] muted mb-1">
                Make room for a good evening
              </p>
              <p className="serif text-xl">A new favorite memory awaits.</p>
            </div>
            <Sparkles className="text-primary" size={25} />
          </div>
          <span className="absolute top-8 -left-4 bg-[#e9bd54] w-22 h-22 rounded-full flex items-center justify-center text-center text-[10px] font-bold -rotate-12">
            GO OUT.
            <br />
            FEEL GOOD.
          </span>
        </div>
      </section>
      <div className="border-y border-border">
        <div className="shell flex flex-wrap justify-between gap-5 py-5 text-[11px] muted">
          <span>✳ &nbsp; Local moments, lasting memories</span>
          <span>✳ &nbsp; Independent hosts, big ideas</span>
          <span>✳ &nbsp; Your next favorite thing is out there</span>
        </div>
      </div>
      <Discovery events={events} />
      <section className="shell pb-16">
        <div className="rounded-2xl bg-[#e9eddf] p-8 md:p-12 flex flex-wrap items-center justify-between gap-7">
          <div>
            <p className="eyebrow muted mb-3">For the community builders</p>
            <h2 className="serif text-4xl">Bring your people together.</h2>
            <p className="muted text-sm mt-4">
              Your idea. Your crowd. We’ll take care of the tickets.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              Create an event <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
