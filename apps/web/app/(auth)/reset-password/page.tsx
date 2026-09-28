export const dynamic = "force-dynamic";
import { AuthForm } from "@/components/auth-form";
import { configured } from "@/lib/config";
export default function Page() {
  return (
    <main className="shell max-w-lg py-20">
      <p className="eyebrow text-primary mb-4">A little more together</p>
      <h1 className="serif text-4xl mb-8">A fresh start.</h1>
      <AuthForm mode="reset-password" enabled={configured()} />
    </main>
  );
}
