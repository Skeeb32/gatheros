"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteRecord } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
export function DeleteEvent({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="panel">
      <h2 className="serif text-2xl mb-4">Delete draft event</h2>
      <Button
        variant="outline"
        onClick={async () => {
          const r = await deleteRecord("events", id);
          if (r.error) setMessage(r.error);
          else router.push("/dashboard/events");
        }}
      >
        Delete unused draft
      </Button>
      {message && (
        <p role="alert" className="notice mt-4">
          {message}
        </p>
      )}
    </div>
  );
}
