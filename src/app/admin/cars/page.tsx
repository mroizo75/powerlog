import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import AdminNav from "@/components/AdminNav";
import CarsTable from "@/components/CarsTable";

export default async function CarsPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "TEKNISK") {
    redirect("/");
  }

  const cars = await api.car.getAll();

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <CarsTable cars={cars} />
      </main>
    </div>
  );
} 