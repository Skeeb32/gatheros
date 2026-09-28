import type { Metadata } from "next";
import "./globals.css";
import "./operations.css";
import { Header } from "@/components/header";
export const metadata: Metadata = {
  title: {
    default: "GatherOS — Your event, in focus",
    template: "%s · GatherOS",
  },
  description:
    "Discover memorable local events and bring your own community together.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
        <footer className="shell flex flex-wrap justify-between gap-4 border-t border-border py-8 text-xs muted">
          <p>GatherOS. &nbsp; A little more together.</p>
          <div className="flex gap-5">
            <a href="/pricing">Organizer pricing</a>
            <a href="/about">About GatherOS</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
