import { feeBps } from "@/lib/config";
export default function Pricing() {
  return (
    <main className="shell max-w-3xl py-24">
      <p className="eyebrow text-primary mb-5">Simple organizer pricing</p>
      <h1 className="serif text-6xl mb-8">
        More gathering.
        <br />
        Less guesswork.
      </h1>
      <div className="panel">
        <h2 className="serif text-3xl mb-4">Free events are free.</h2>
        <p className="muted leading-7">
          Paid tickets include a {feeBps() / 100}% booking fee added at
          checkout. Your ticket price is transferred to your connected Stripe
          account. Stripe processing fees are charged to the platform for
          destination charges. Refund and dispute costs also apply to the
          platform.
        </p>
      </div>
    </main>
  );
}
