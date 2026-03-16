"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import AdminNav from "@/components/AdminNav";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function BoxLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [startNumber, setStartNumber] = useState("");
  const [boxId, setBoxId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");

  const utils = api.useUtils();

  const { data: boxlogs, isLoading: isLoadingBoxlogs } = api.boxlog.getAll.useQuery();
  const { data: declarations, isLoading: isLoadingDeclarations } = api.declaration.getAll.useQuery();

  // Filtrer ut deklarasjoner som har en aktiv box-kobling
  const declarationsWithBox = declarations?.filter(declaration => 
    boxlogs?.some(boxlog => 
      boxlog.startNumber === declaration.startNumber && 
      boxlog.isActive
    )
  );

  const handleSearchStartNumber = async () => {
    if (!startNumber.trim()) {
      setError("Vennligst skriv inn et startnummer");
      return;
    }

    try {
      // Sjekk om denne startnummeret allerede er tilknyttet en box
      await utils.boxlog.getByStartNumber.fetch(startNumber);
      setError("Dette startnummeret er allerede tilknyttet en box");
    } catch (error) {
      // Hvis ingen box er knyttet til dette startnummeret, fortsett
      setError(null);
    }
  };

  const handleSearchBoxId = async () => {
    if (!boxId.trim()) {
      setError("Vennligst skriv inn en Box ID");
      return;
    }

    try {
      // Sjekk om denne boxen allerede er tilknyttet et startnummer
      await utils.boxlog.getByBoxId.fetch(boxId);
      setError("Denne Box ID er allerede tilknyttet et startnummer");
    } catch (error) {
      // Hvis ingen startnummer er knyttet til denne boxen, fortsett
      setError(null);
    }
  };

  const { mutate: createBoxLog, isPending: isSubmitting } = api.boxlog.create.useMutation({
    onSuccess: () => {
      setSuccess("Box koblet til startnummer!");
      setError(null);
      setStartNumber("");
      setBoxId("");
      utils.boxlog.getAll.invalidate();
    },
    onError: (error) => {
      setError(error.message);
      setSuccess(null);
    },
  });

  const { mutate: deactivateBoxLog, isPending: isDeactivating } = api.boxlog.deactivate.useMutation({
    onSuccess: () => {
      setSuccess("Box-kobling deaktivert!");
      utils.boxlog.getAll.invalidate();
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const { mutate: removeBoxLog, isPending: isRemoving } = api.boxlog.remove.useMutation({
    onSuccess: () => {
      setSuccess("Box-kobling fjernet!");
      utils.boxlog.getAll.invalidate();
    },
    onError: (error: { message: string }) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startNumber || !boxId) {
      setError("Vennligst fyll ut både startnummer og Box ID");
      return;
    }

    createBoxLog({
      startNumber,
      boxId,
    });
  };

  const handleDeactivate = (id: string) => {
    deactivateBoxLog(id);
  };

  const handleRemoveBox = (startNumber: string) => {
    removeBoxLog(startNumber);
  };

  // Redirect uautoriserte brukere til login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "ADMIN" && session?.user?.role !== "POWERLOG" && session?.user?.role !== "VEKTREG") {
      router.push("/");
    }
  }, [status, session, router]);

  // Vis loading state mens session sjekkes
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // Ikke vis noe hvis brukeren ikke er admin
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "POWERLOG" && session.user.role !== "VEKTREG")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight text-gray-900"
          >
            Box Log
          </motion.h1>
          <div className="mt-4 sm:mt-0">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("create")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === "create"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Koble Box
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  activeTab === "list"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Box Oversikt
              </button>
            </div>
          </div>
        </div>

        {activeTab === "create" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Koble startnummer med Box ID
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Bruk dette skjemaet for å koble et startnummer med en Box ID for bruk i
                vektregistrering og powerlog.
              </p>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div>
                  <label
                    htmlFor="startNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Startnummer
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="startNumber"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="F.eks. 123"
                    />
                    <button
                      type="button"
                      onClick={handleSearchStartNumber}
                      className="ml-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Sjekk
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="boxId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Box ID
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="boxId"
                      value={boxId}
                      onChange={(e) => setBoxId(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="F.eks. BOX001"
                    />
                    <button
                      type="button"
                      onClick={handleSearchBoxId}
                      className="ml-2 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Sjekk
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? "Kobler..." : "Koble Box"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === "list" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Biler med Box ID
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Liste over biler som har en aktiv box-kobling.
              </p>

              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
              )}

              {isLoadingDeclarations || isLoadingBoxlogs ? (
                <div className="mt-4 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Startnummer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Bil
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Box ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Handling
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {declarationsWithBox?.map((declaration) => {
                        const boxLog = boxlogs?.find(
                          (box) => box.startNumber === declaration.startNumber && box.isActive
                        );
                        return (
                          <tr key={declaration.id}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                              {declaration.startNumber}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                              {declaration.car
                                ? `${declaration.car.make} ${declaration.car.model}`
                                : "Ukjent"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                              {boxLog?.boxId}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                              <button
                                onClick={() => handleRemoveBox(declaration.startNumber)}
                                disabled={isRemoving}
                                className="text-red-600 hover:text-red-900"
                              >
                                Fjern Box ID
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {declarationsWithBox?.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-4 text-center text-sm text-gray-500"
                          >
                            Ingen biler med box-kobling funnet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
} 