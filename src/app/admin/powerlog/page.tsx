import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import PowerlogDashboard from "@/components/PowerlogDashboard";

export default async function PowerlogPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return <PowerlogDashboard />;
} 