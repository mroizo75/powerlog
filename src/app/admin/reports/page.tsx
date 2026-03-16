"use client";

import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import ReportDashboard from "@/components/ReportDashboard";
import AdminNav from "@/components/AdminNav";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function ReportsPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    } else if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEKNISK") {
      redirect("/");
    }
  }, [status, session]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEKNISK")) {
    return null;
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