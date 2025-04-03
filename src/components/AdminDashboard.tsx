"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import WeightRegistration from "@/components/WeightRegistration";
import AdminNav from "./AdminNav";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("cars");
  const [selectedClass, setSelectedClass] = useState("");

  const { data: cars, isLoading: isLoadingCars } = api.car.getAll.useQuery();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading" || isLoadingCars) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  // Filtrer biler basert på valgt klasse
  const filteredDeclarations = cars?.flatMap(car => 
    car.declarations?.filter(declaration => 
      !selectedClass || declaration.declaredClass === selectedClass
    ).map(declaration => ({
      ...declaration,
      car
    })) || []
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      {/* Hovedinnhold */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === "cars" && (
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Biloversikt
                  </h3>
                  <select
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="rounded-md border-gray-300 text-sm"
                  >
                    <option value="">Alle klasser</option>
                    {Array.from(new Set(cars?.flatMap(car => car.declarations?.map(d => d.declaredClass) || []))).map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Startnummer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Klasse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Bil
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Vekt (kg)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Effekt (hk)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Insendt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Handlinger
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredDeclarations?.map((declaration) => (
                        <tr key={declaration.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {declaration.startNumber}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {declaration.declaredClass}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {declaration.car.make} {declaration.car.model} ({declaration.car.year})
                            <br />
                            <span className="text-xs text-gray-500">
                              {declaration.car.registration || "Ikke registrert"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {declaration.declaredWeight || "-"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {declaration.declaredPower || "-"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(declaration.createdAt).toLocaleDateString("nb-NO")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            <button
                              onClick={() => router.push(`/admin/cars/${declaration.car.id}`)}
                              className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                            >
                              Se detaljer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "weight" && (
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Vektregistrering
                </h3>
              </div>
              <div className="border-t border-gray-200">
                <WeightRegistration />
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Brukeradministrasjon
                </h3>
              </div>
              <div className="border-t border-gray-200">
                {/* Brukeradministrasjon kommer her */}
                <p className="px-4 py-4 text-sm text-gray-500">
                  Brukeradministrasjon kommer snart...
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
} 