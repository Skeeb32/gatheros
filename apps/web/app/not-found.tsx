import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell py-24">
      <h1 className="serif text-5xl mb-6">This moment isn’t here.</h1>
      <Link href="/" className="text-primary underline">
        Discover another experience
      </Link>
    </main>
  );
}
