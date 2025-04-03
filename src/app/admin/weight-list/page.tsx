import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import WeightList from "@/components/WeightList";
import AdminNav from "@/components/AdminNav";

export default async function WeightListPage() {
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
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <WeightList />
      </main>
    </div>
  );
} 