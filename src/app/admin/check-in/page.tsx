"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import DeclarationCheck from "@/components/DeclarationCheck";
import { api } from "@/trpc/react";

export default function CheckInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Hent deklarasjoner med polling
  const { data: declarations, isLoading } = api.declaration.getAll.useQuery(undefined, {
    refetchInterval: 5000, // Oppdater hvert 5. sekund
    refetchOnWindowFocus: true, // Oppdater når vinduet får fokus
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "ADMIN" && session?.user?.role !== "INNSJEKK") {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "INNSJEKK")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Innsjekk av selvangivelser</h1>
          <p className="mt-2 text-gray-600">
            Oversikt over status på selvangivelser for inneværende sesong
          </p>
        </div>
        <DeclarationCheck declarations={declarations} />
      </main>
    </div>
  );
} 