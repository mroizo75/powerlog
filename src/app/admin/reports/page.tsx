import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import ReportDashboard from "@/components/ReportDashboard";
import AdminNav from "@/components/AdminNav";

export default async function ReportsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <ReportDashboard />
      </main>
    </div>
  );
} 