import Link from "next/link";
export default function Cancel() {
  return (
    <main className="shell py-24">
      <h1 className="serif text-5xl mb-5">A little more time to decide.</h1>
      <p className="muted mb-5">
        You left checkout. Any held tickets will be released when your checkout
        expires.
      </p>
      <Link href="/" className="text-primary underline">
        Explore events
      </Link>
    </main>
  );
}
