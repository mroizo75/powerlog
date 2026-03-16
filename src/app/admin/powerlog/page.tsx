import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import PowerlogDashboard from "@/components/PowerlogDashboard";
import AdminNav from "@/components/AdminNav";

export default async function PowerlogPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "POWERLOG") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="w-full px-4 py-8">
        <PowerlogDashboard />
      </main>
    </div>
  );
} 
