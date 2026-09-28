"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell py-24">
      <h1 className="serif text-4xl mb-5">Something didn’t load.</h1>
      <p className="muted mb-6">
        Please try again. If this continues, check your connection or service
        configuration.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
