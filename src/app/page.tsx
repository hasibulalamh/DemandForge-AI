import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/public-config";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }
  const user = await getAuthUser();
  redirect(user ? "/dashboard" : "/login");
}
