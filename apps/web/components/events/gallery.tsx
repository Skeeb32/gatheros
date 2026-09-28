import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
export async function EventGallery({ eventId }: { eventId: string }) {
  if (!configured()) return null;
  const db = await serverClient();
  const { data, error } = await db
    .from("event_images")
    .select("id,storage_path,alt_text")
    .eq("event_id", eventId)
    .order("sort_order");
  if (error) throw error;
  if (!data?.length) return null;
  const images = await Promise.all(
    data.map(async (image) => {
      const { data: signed } = await db.storage
        .from("event-images")
        .createSignedUrl(image.storage_path, 3600);
      return { ...image, url: signed?.signedUrl };
    }),
  );
  return (
    <div className="grid grid-cols-2 gap-3 my-8">
      {images
        .filter((i) => i.url)
        .map((i) => (
          <img
            key={i.id}
            src={i.url}
            alt={i.alt_text || "Event photo"}
            className="rounded-xl w-full aspect-square object-cover"
          />
        ))}
    </div>
  );
}
