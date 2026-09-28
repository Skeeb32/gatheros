"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
export function ImageUpload({
  eventId,
  demo,
}: {
  eventId: string;
  demo: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (demo) {
          setMessage("Configure Supabase to upload images.");
          return;
        }
        const data = new FormData(e.currentTarget);
        const file = data.get("image") as File;
        if (
          !file?.size ||
          file.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png", "image/webp"].includes(file.type)
        ) {
          setMessage("Choose a JPEG, PNG, or WebP up to 5 MB.");
          return;
        }
        setBusy(true);
        try {
          const db = browserClient();
          const path = `${eventId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
          const upload = await db.storage
            .from("event-images")
            .upload(path, file);
          if (upload.error) throw upload.error;
          const saved = await db.from("event_images").insert({
            event_id: eventId,
            storage_path: path,
            alt_text: String(data.get("alt") || "Event photograph"),
          });
          if (saved.error) {
            await db.storage.from("event-images").remove([path]);
            throw saved.error;
          }
          setMessage("Image added to the public event gallery.");
        } catch {
          setMessage(
            "Upload failed. Check your permissions and bucket configuration.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="serif text-2xl">Event gallery</h2>
      <label>
        Image
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <label>
        Image description
        <input name="alt" required maxLength={300} />
      </label>
      <Button disabled={busy}>{busy ? "Uploading…" : "Upload image"}</Button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}
