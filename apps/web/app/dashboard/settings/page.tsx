import { dashboardData } from "@/lib/dashboard";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { Settings } from "@/components/dashboard/settings";
export default async function SettingsPage() {
  const { organizers } = await dashboardData();
  let members: { organizer_id: string; user_id: string; role: string }[] = [];
  let userId = "";
  if (configured()) {
    const db = await serverClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    userId = user!.id;
    const result = await db
      .from("organizer_members")
      .select("organizer_id,user_id,role");
    if (result.error) throw result.error;
    members = result.data;
  }
  return (
    <>
      <h1 className="serif text-5xl mb-8">Make it yours.</h1>
      <Settings
        organizers={organizers}
        members={members}
        userId={userId}
        demo={!configured()}
      />
    </>
  );
}
