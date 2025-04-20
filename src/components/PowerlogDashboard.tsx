"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import AdminNav from "./AdminNav";
import { type Powerlog, type WeightMeasurement, type Declaration } from "@prisma/client";
import { type TRPCClientErrorLike } from "@trpc/client";
import { type DeclarationClass } from "@/types/declaration";

interface PowerlogWithDeclaration extends Powerlog {
  declaration: Declaration & {
    car: {
      make: string;
      model: string;
      year: number;
    };
  };
  measuredWeight: number;
}

interface PowerlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { startNumber: string; heatNumber: string; weight: number; nullPoint: number; boxId: string; measuredPower: number }) => void;
  error: string | null;
  selectedLog?: PowerlogWithDeclaration | null;
}

function PowerlogModal({ isOpen, onClose, onSubmit, error, selectedLog }: PowerlogModalProps) {
  const [formData, setFormData] = useState({
    startNumber: selectedLog?.declaration?.startNumber || "",
    heatNumber: selectedLog?.heatNumber || "",
    weight: selectedLog?.weight || 0,
    nullPoint: selectedLog?.nullPoint || 0,
    boxId: selectedLog?.boxId || "",
    measuredPower: selectedLog?.measuredPower || 0,
  });

  useEffect(() => {
    if (selectedLog) {
      setFormData({
        startNumber: selectedLog.declaration.startNumber,
        heatNumber: selectedLog.heatNumber,
        weight: selectedLog.weight,
        nullPoint: selectedLog.nullPoint,
        boxId: selectedLog.boxId,
        measuredPower: selectedLog.measuredPower || 0,
      });
    }
  }, [selectedLog]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h3 className="mb-4 text-xl font-bold">Registrer Målt Effekt fra Powerlog</h3>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Startnummer
            </label>
            <input
              type="text"
              value={formData.startNumber}
              onChange={(e) => setFormData({ ...formData, startNumber: e.target.value })}
              className="w-full rounded-md border border-gray-300 p-2"
              required
              disabled
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Heat
            </label>
            <input
              type="text"
              value={formData.heatNumber}
              className="w-full rounded-md border border-gray-300 p-2 bg-gray-100"
              disabled
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Vekt (kg)
            </label>
            <input
              type="number"
              value={formData.weight}
              className="w-full rounded-md border border-gray-300 p-2 bg-gray-100"
              disabled
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nullpunkt
            </label>
            <input
              type="number"
              value={formData.nullPoint}
              className="w-full rounded-md border border-gray-300 p-2 bg-gray-100"
              disabled
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Box ID
            </label>
            <input
              type="text"
              value={formData.boxId}
              className="w-full rounded-md border border-gray-300 p-2 bg-gray-100"
              disabled
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Målt Effekt (hk)
            </label>
            <input
              type="number"
              value={formData.measuredPower}
              onChange={(e) => setFormData({ ...formData, measuredPower: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-300 p-2"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Lagre
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Definer grenser for hver klasse
const limits: Record<string, { normal: number; turbo?: number }> = {
  "GT5": { normal: 7.3 },
  "GT4": { normal: 4.9, turbo: 5.5 },
  "GT3": { normal: 3.7, turbo: 4.0 },
  "GT1": { normal: 2.5 },
  "GT_PLUS": { normal: 1.0 },
  "OTHER": { normal: 0.0 },
};

export default function PowerlogDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPowerlogModalOpen, setIsPowerlogModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<PowerlogWithDeclaration | null>(null);
  const [measuredPower, setMeasuredPower] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [startNumber, setStartNumber] = useState("");
  const [boxId, setBoxId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const itemsPerPage = 10;

  const utils = api.useUtils();

  const { data: powerlogs, isLoading: isLoadingPowerlogs } = api.powerlog.getAll.useQuery();
  const { data: weightMeasurements, isLoading: isLoadingWeightMeasurements } = api.weight.getAll.useQuery();
  const { mutate: createReport } = api.report.create.useMutation({
    onSuccess: () => {
      utils.report.getAll.invalidate();
      router.push("/admin/reports");
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      setError(error.message);
    },
  });

  const { mutate: createPowerlog } = api.powerlog.create.useMutation({
    onSuccess: () => {
      utils.powerlog.getAll.invalidate();
      setIsModalOpen(false);
      setStartNumber("");
      setBoxId("");
      setError(null);
      setSearchResult(null);
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      setError(error.message);
    },
  });

  const { mutate: updatePowerlog } = api.powerlog.update.useMutation({
    onSuccess: () => {
      utils.powerlog.getAll.invalidate();
      setIsPowerlogModalOpen(false);
      setSelectedLog(null);
      setError(null);
    },
    onError: (error: TRPCClientErrorLike<any>) => {
      setError(error.message);
    },
  });

  const handleSearchStartNumber = async () => {
    if (!startNumber.trim()) {
      setError("Vennligst fyll inn startnummer");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Først sjekk om denne startnummeret finnes i boxlog
      const boxlogResult = await utils.boxlog.getByStartNumber.fetch(startNumber);
      
      if (boxlogResult) {
        // Hent deklarasjonen fra box-loggen
        setSearchResult({
          startNumber,
          boxId: boxlogResult.boxId,
          declaration: boxlogResult.declaration,
        });
        setBoxId(boxlogResult.boxId);
      } else {
        setError("Ingen box er knyttet til dette startnummeret. Vennligst registrer box i Box Log.");
      }
    } catch (error: any) {
      setError(error.message || "Feil ved søk etter startnummer");
    } finally {
      setIsSearching(false);
    }
  };

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  const isLoading = isLoadingPowerlogs || isLoadingWeightMeasurements;

  // Kombiner powerlog-data med vektmålinger
  const combinedData = powerlogs?.map(log => {
    // Finn tilsvarende vektmåling basert på startnummer og tidspunkt
    const matchingMeasurement = weightMeasurements?.find(measurement => 
      measurement.declaration?.startNumber === log.declaration.startNumber &&
      Math.abs(new Date(measurement.createdAt).getTime() - new Date(log.createdAt).getTime()) < 3600000 // Innen 1 time
    );

    return {
      ...log,
      nullPoint: matchingMeasurement?.nullPoint || log.nullPoint,
      measuredWeight: matchingMeasurement?.measuredWeight || log.weight,
      boxId: log.boxId,
      measuredPower: log.measuredPower,
    };
  });

  // Paginering
  const totalPages = combinedData ? Math.ceil(combinedData.length / itemsPerPage) : 0;
  const paginatedData = combinedData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmit = (data: {
    startNumber: string;
    heatNumber: string;
    weight: number;
    nullPoint: number;
    boxId: string;
    measuredPower: number;
  }) => {
    if (selectedLog) {
      updatePowerlog({
        id: selectedLog.id,
        measuredPower: data.measuredPower,
      });
    } else {
      createPowerlog(data);
    }
  };

  const handlePowerlogClick = (log: PowerlogWithDeclaration) => {
    setSelectedLog(log);
    setIsPowerlogModalOpen(true);
  };

  const getWeightMeasurement = (log: PowerlogWithDeclaration) => {
    return weightMeasurements?.find((measurement: WeightMeasurement) => 
      measurement.declarationId === log.declarationId
    );
  };

  // Beregn vekt/effekt-forhold
  const calculateWeightPowerRatio = (weight: number, power: number | null) => {
    if (!power || power === 0) return null;
    return (weight / power).toFixed(2);
  };

  // Sjekk om vekt/effekt-forholdet er innenfor grensen
  const isWithinLimit = (ratio: number | null, className: string, isTurbo: boolean) => {
    if (!ratio) return false;
    
    const limit = limits[className] || limits["OTHER"];
    const requiredRatio = isTurbo ? (limit?.turbo ?? limit?.normal ?? 0) : (limit?.normal ?? 0);
    return ratio >= requiredRatio;
  };

  const handleReportClick = (log: PowerlogWithDeclaration) => {
    if (!log.measuredPower) return;
    
    const ratio = parseFloat(calculateWeightPowerRatio(log.measuredWeight, log.measuredPower) || "0");
    const className = log.declaration?.declaredClass || "OTHER";
    const isTurbo = log.declaration?.isTurbo || false;
    const withinLimit = isWithinLimit(ratio, className, isTurbo);

    if (!withinLimit) {
      // Hent bilinformasjon fra declaration
      const carInfo = log.declaration?.car 
        ? `${log.declaration.car.make} ${log.declaration.car.model} (${log.declaration.car.year})`
        : "Ukjent bil";

      const reportDetails = {
        measuredWeight: log.measuredWeight,
        declaredPower: log.declaration.declaredPower || 0,
        ratio: ratio,
        requiredRatio: isTurbo ? (limits[className]?.turbo ?? limits[className]?.normal ?? 0) : (limits[className]?.normal ?? 0),
        carInfo: carInfo,
        startNumber: log.declaration.startNumber,
        source: "POWERLOG",
        heatNumber: log.heatNumber,
        boxId: log.boxId,
        nullPoint: log.nullPoint,
      };

      createReport({
        type: "WEIGHT_POWER_RATIO" as const,
        declarationId: log.declaration.id,
        details: reportDetails,
        source: "POWERLOG",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />

      {/* Hovedinnhold */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Powerlog Oversikt</h2>
              <button
                onClick={() => {
                  setIsModalOpen(true);
                  setStartNumber("");
                  setBoxId("");
                  setError(null);
                  setSearchResult(null);
                }}
                className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Registrer Ny Powerlog
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Startnummer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Heat
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Vekt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Nullpunkt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Box ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Målt Effekt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Vekt/Effekt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Krav
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Tidspunkt
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Aksjoner
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedData?.map((log) => {
                        const ratio = log.measuredPower ? parseFloat(calculateWeightPowerRatio(log.measuredWeight, log.measuredPower) || "0") : null;
                        const className = log.declaration?.declaredClass || "OTHER";
                        const isTurbo = log.declaration?.isTurbo || false;
                        const withinLimit = isWithinLimit(ratio, className, isTurbo);
                        
                        return (
                          <tr key={log.id} className={withinLimit ? "" : "bg-red-50"}>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.declaration?.startNumber}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.heatNumber}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.measuredWeight} kg
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.nullPoint}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.boxId}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.measuredPower ? `${log.measuredPower} hk` : "-"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {log.measuredPower ? `${calculateWeightPowerRatio(log.measuredWeight, log.measuredPower)} kg/hk` : "-"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {isTurbo ? (limits[className]?.turbo ?? limits[className]?.normal ?? 0) : (limits[className]?.normal ?? 0)} kg/hk
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                withinLimit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {withinLimit ? "OK" : "Feil"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {new Date(log.createdAt).toLocaleString("nb-NO")}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handlePowerlogClick(log as PowerlogWithDeclaration)}
                                  className="rounded-md bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                                >
                                  Powerlog
                                </button>
                                <button
                                  onClick={() => handleReportClick(log as PowerlogWithDeclaration)}
                                  className="rounded-md bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                                  disabled={!log.measuredPower || withinLimit}
                                >
                                  Rapporter
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginering */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="mr-2 rounded-md bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
                      >
                        Forrige
                      </button>
                      <span className="mx-2">
                        Side {currentPage} av {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="ml-2 rounded-md bg-blue-500 px-4 py-2 text-white disabled:bg-gray-300"
                      >
                        Neste
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">
                      Viser {paginatedData?.length} av {combinedData?.length} målinger
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-bold">Ny Powerlog</h3>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mb-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  placeholder="Startnummer"
                  className="w-full rounded-md border border-gray-300 p-2"
                />
                <button
                  onClick={handleSearchStartNumber}
                  disabled={isSearching}
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {isSearching ? "Søker..." : "Søk"}
                </button>
              </div>
            </div>

            {searchResult && (
              <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-700">
                <p className="font-medium">Bil funnet:</p>
                <p>
                  {searchResult.declaration?.car?.make} {searchResult.declaration?.car?.model} (
                  {searchResult.declaration?.car?.year})
                </p>
                <p className="mt-2 font-medium">Box ID:</p>
                <p>{searchResult.boxId}</p>
              </div>
            )}

            {searchResult && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();

                  if (!searchResult) return;

                  const formData = new FormData(e.currentTarget);
                  const heatNumber = formData.get("heatNumber") as string;
                  const weight = parseFloat(formData.get("weight") as string);
                  const nullPoint = parseFloat(formData.get("nullPoint") as string);

                  if (!heatNumber || isNaN(weight) || isNaN(nullPoint)) {
                    setError("Vennligst fyll ut alle feltene");
                    return;
                  }

                  createPowerlog({
                    startNumber: searchResult.startNumber,
                    heatNumber,
                    weight,
                    nullPoint,
                    boxId: searchResult.boxId,
                    measuredPower: 0, // Dette vil bli fylt ut senere
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Heat
                  </label>
                  <select
                    name="heatNumber"
                    className="w-full rounded-md border border-gray-300 p-2"
                    required
                  >
                    <option value="">Velg heat</option>
                    <option value="Trening">Trening</option>
                    <option value="Kval">Kval</option>
                    <option value="Finale 1">Finale 1</option>
                    <option value="Finale 2">Finale 2</option>
                    <option value="Finale 3">Finale 3</option>
                    <option value="Finale 4">Finale 4</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Vekt (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    step="0.01"
                    className="w-full rounded-md border border-gray-300 p-2"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nullpunkt
                  </label>
                  <input
                    type="number"
                    name="nullPoint"
                    step="0.01"
                    className="w-full rounded-md border border-gray-300 p-2"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setStartNumber("");
                      setBoxId("");
                      setError(null);
                      setSearchResult(null);
                    }}
                    className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Registrer
                  </button>
                </div>
              </form>
            )}

            {!searchResult && (
              <div className="flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
                >
                  Lukk
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <PowerlogModal
        isOpen={isPowerlogModalOpen}
        onClose={() => {
          setIsPowerlogModalOpen(false);
          setSelectedLog(null);
          setMeasuredPower("");
          setError(null);
        }}
        onSubmit={handleSubmit}
        error={error}
        selectedLog={selectedLog}
      />
    </div>
  );
} 