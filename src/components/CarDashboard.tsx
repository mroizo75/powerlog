"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";

export default function CarDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("cars");
  const [selectedClass, setSelectedClass] = useState<string>("all");

  const { data: cars, isLoading } = api.car.getAll.useQuery();

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  // Filtrer biler basert på valgt klasse
  const filteredCars = cars?.filter((car) => {
    if (selectedClass === "all") return true;
    return car.declarations.some((decl) => decl.declaredClass === selectedClass);
  });

  // Hent unike klasser fra alle biler
  const uniqueClasses = Array.from(
    new Set(cars?.flatMap((car) => car.declarations.map((decl) => decl.declaredClass)) ?? [])
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigasjonsbar */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-gray-900">Admin Panel</span>
              </div>
              <div className="ml-6 flex space-x-8">
                <button
                  onClick={() => router.push("/admin")}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    activeTab === "dashboard"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/admin/users")}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    activeTab === "users"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Brukere
                </button>
                <button
                  onClick={() => router.push("/admin/cars")}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    activeTab === "cars"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Biler
                </button>
                <button
                  onClick={() => router.push("/admin/reports")}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    activeTab === "reports"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Rapporter
                </button>
                <button
                  onClick={() => router.push("/admin/powerlog")}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    activeTab === "powerlog"
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  Powerlog
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hovedinnhold */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Bil Oversikt</h2>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">Alle klasser</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              </div>
            ) : (
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
                        Registreringsnummer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Merke/Modell
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        År
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
                        Handling
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredCars?.flatMap((car) =>
                      car.declarations.map((decl) => (
                        <tr key={`${car.id}-${decl.id}`}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {decl.startNumber}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {decl.declaredClass}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {car.registration || "Ikke registrert"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {car.make} {car.model}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {car.year}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {decl.declaredWeight || "-"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {decl.declaredPower || "-"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(decl.createdAt).toLocaleDateString("nb-NO")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            <button
                              onClick={() => router.push(`/admin/cars/${car.id}`)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Se detaljer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 