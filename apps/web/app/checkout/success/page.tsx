import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Success() {
  return (
    <main className="shell py-24 max-w-2xl text-center">
      <p className="eyebrow text-primary mb-5">One step closer</p>
      <h1 className="serif text-5xl mb-6">Watch your inbox.</h1>
      <p className="muted leading-7 mb-8">
        Once payment is confirmed, we’ll email your tickets and QR codes. This
        page alone does not confirm your purchase. Signed-in buyers can also
        find confirmed tickets in their account.
      </p>
      <Button asChild>
        <Link href="/my-tickets">View my tickets</Link>
      </Button>
    </main>
  );
}
