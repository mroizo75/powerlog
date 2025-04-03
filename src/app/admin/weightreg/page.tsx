import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import WeightRegistration from "@/components/WeightRegistration";

export default async function WeightRegPage() {
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
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Vektreg Dashboard</h1>
        <WeightRegistration />
      </main>
    </div>
  );
} 