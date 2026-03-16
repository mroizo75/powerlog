"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { WeightMeasurement } from "@prisma/client";
import { getRequiredRatio } from "@/config/classLimits";

interface DeclarationWithCar {
  id: string;
  startNumber: string;
  declaredClass: string;
  declaredWeight: number | null;
  declaredPower: number | null;
  createdAt: Date;
  car: {
    make: string;
    model: string;
    year: number;
    registration: string | null;
  };
  weightMeasurements: WeightMeasurement[];
  isTurbo?: boolean;
  lastMeasurement: WeightMeasurement | null;
}

export default function WeightList() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedHeat, setSelectedHeat] = useState("");
  const [searchStartNumber, setSearchStartNumber] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

  const utils = api.useUtils();
  const { data: cars, isLoading } = api.car.getAll.useQuery();
  const { data: archivedMeasurements } = api.weight.getArchived.useQuery(undefined, {
    enabled: activeTab === "archive"
  });

  const archiveMutation = api.weight.archive.useMutation({
    onSuccess: () => {
      void utils.car.getAll.invalidate();
      void utils.weight.getArchived.invalidate();
    },
  });

  const archiveAllMutation = api.weight.archiveAll.useMutation({
    onSuccess: () => {
      void utils.car.getAll.invalidate();
      void utils.weight.getArchived.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  // Hent alle unike klasser og heat
  const allClasses = Array.from(new Set(cars?.flatMap(car => 
    car.declarations?.map(d => d.declaredClass) || []
  ))).sort();

  const allHeats = Array.from(new Set(cars?.flatMap(car => 
    car.declarations?.flatMap(d => d.weightMeasurements?.map(w => w.heat) || []) || []
  ))).filter((heat): heat is string => heat !== null).sort();

  // Kombiner selvangivelser med vektmålinger
  const weightList = cars?.flatMap(car => 
    car.declarations?.flatMap(declaration => {
      const measurements = declaration.weightMeasurements || [];
      
      // Hvis ingen målinger, returner ikke noe
      if (measurements.length === 0) {
        return [];
      }

      // Returner en rad for hver måling
      return measurements.map(measurement => ({
        ...declaration,
        car,
        lastMeasurement: measurement,
        weightMeasurements: measurements,
        isTurbo: declaration.isTurbo
      } as DeclarationWithCar));
    }) || []
  )
  .filter((item: DeclarationWithCar) => 
    (!selectedClass || item.declaredClass === selectedClass) &&
    (!selectedHeat || item.lastMeasurement?.heat === selectedHeat) &&
    (!searchStartNumber || item.startNumber.toLowerCase().includes(searchStartNumber.toLowerCase()))
  )
  .sort((a: DeclarationWithCar, b: DeclarationWithCar) => {
    const getMeasurementTimestamp = (measurement: WeightMeasurement | null) => {
      if (!measurement) return 0;
      return new Date(measurement.createdAt).getTime();
    };

    const timeDiff = getMeasurementTimestamp(b.lastMeasurement) - getMeasurementTimestamp(a.lastMeasurement);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    // Stabil tie-break når to målinger har samme timestamp
    return (b.lastMeasurement?.id ?? "").localeCompare(a.lastMeasurement?.id ?? "");
  });

  // Beregn vekt/effekt-faktor
  const calculateWeightPowerRatio = (weight: number | null, power: number | null) => {
    if (!weight || !power || power === 0) return null;
    return Number((weight / power).toFixed(2));
  };

  // Sjekk om vekt/effekt-forholdet er innenfor grensen
  const isWithinLimit = (ratio: number | null, className: string, isTurbo: boolean) => {
    if (!ratio) return false;
    const limit = getRequiredRatio(className as "GT5" | "GT4" | "GT3" | "GT1" | "GT_PLUS" | "OTHER", isTurbo);
    return ratio >= limit;
  };

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Vektliste
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  activeTab === "active"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Aktive målinger
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  activeTab === "archive"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Arkiverte målinger
              </button>
            </div>
          </div>
          <div className="flex space-x-4">
            {activeTab === "active" && (
              <button
                onClick={() => archiveAllMutation.mutate()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Arkiver alle
              </button>
            )}
            <input
              type="text"
              placeholder="Søk på startnummer"
              value={searchStartNumber}
              onChange={(e) => setSearchStartNumber(e.target.value)}
              className="rounded-md border-gray-300 text-sm"
            />
            <select
              onChange={(e) => setSelectedClass(e.target.value)}
              className="rounded-md border-gray-300 text-sm"
            >
              <option value="">Alle klasser</option>
              {allClasses.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
            <select
              onChange={(e) => setSelectedHeat(e.target.value)}
              className="rounded-md border-gray-300 text-sm"
            >
              <option value="">Alle heat</option>
              {allHeats.map((heat) => (
                <option key={heat} value={heat}>
                  Heat {heat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="overflow-hidden">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4">
                  Startnummer
                </th>
                <th className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4">
                  Klasse
                </th>
                <th className="hidden px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4 xl:table-cell">
                  Bil
                </th>
                <th className="hidden px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4 xl:table-cell">
                  Selvangivelse
                </th>
                <th className="hidden px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4 xl:table-cell">
                  Heat
                </th>
                <th className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4">
                  Vektmåling
                </th>
                <th className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4">
                  Status
                </th>
                {activeTab === "active" && (
                  <th className="px-2 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-gray-500 md:px-4">
                    Handlinger
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {activeTab === "active" ? (
                weightList?.map((item, index) => {
                  const ratio = item.lastMeasurement 
                    ? calculateWeightPowerRatio(item.lastMeasurement.measuredWeight, item.declaredPower)
                    : calculateWeightPowerRatio(item.declaredWeight, item.declaredPower);
                  
                  const isOk = isWithinLimit(ratio, item.declaredClass, item.isTurbo ?? false);

                  return (
                    <tr key={`${item.id}-${index}`}>
                      <td className="px-2 py-3 align-top text-xs font-medium text-gray-900 md:px-4 md:text-sm">
                        {item.startNumber}
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                        {item.declaredClass}
                      </td>
                      <td className="hidden px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm xl:table-cell">
                        {item.car.make} {item.car.model} ({item.car.year})
                      </td>
                      <td className="hidden px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm xl:table-cell">
                        <div className="space-y-1">
                          <p>Vekt: {item.declaredWeight || "-"} kg</p>
                          <p>Effekt: {item.declaredPower || "-"} hk</p>
                          <p>Vekt/Effekt: {calculateWeightPowerRatio(item.declaredWeight, item.declaredPower) || "-"} kg/hk</p>
                          <p className="text-xs text-gray-500">
                            Insendt: {format(new Date(item.createdAt), "dd.MM.yyyy", { locale: nb })}
                          </p>
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm xl:table-cell">
                        {item.lastMeasurement?.heat || "-"}
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                        {item.lastMeasurement ? (
                          <div className="space-y-1">
                            <p>Vekt: {item.lastMeasurement.measuredWeight} kg</p>
                            <p>Nullpunkt: {item.lastMeasurement.nullPoint}</p>
                            <p>Vekt/Effekt: {calculateWeightPowerRatio(item.lastMeasurement.measuredWeight, item.declaredPower) || "-"} kg/hk</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(item.lastMeasurement.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: nb })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">Ingen målinger</span>
                        )}
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                        <div className="flex items-center space-x-2">
                          <div className={`h-4 w-4 rounded-full ${isOk ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{isOk ? 'OK' : 'Under grensen'}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                        {item.lastMeasurement && (
                          <button
                            onClick={() => archiveMutation.mutate({ id: item.lastMeasurement!.id })}
                            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            Arkiver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                archivedMeasurements?.map((measurement) => (
                  <tr key={measurement.id}>
                    <td className="px-2 py-3 align-top text-xs font-medium text-gray-900 md:px-4 md:text-sm">
                      {measurement.declaration.startNumber}
                    </td>
                    <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                      {measurement.declaration.declaredClass}
                    </td>
                    <td className="hidden px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm xl:table-cell">
                      {measurement.declaration.car.make} {measurement.declaration.car.model} ({measurement.declaration.car.year})
                    </td>
                    <td className="hidden px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm xl:table-cell">
                      <div className="space-y-1">
                        <p>Vekt: {measurement.declaration.declaredWeight || "-"} kg</p>
                        <p>Effekt: {measurement.declaration.declaredPower || "-"} hk</p>
                        <p>Vekt/Effekt: {calculateWeightPowerRatio(measurement.declaration.declaredWeight, measurement.declaration.declaredPower) || "-"} kg/hk</p>
                      </div>
                    </td>
                    <td className="hidden px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm xl:table-cell">
                      {measurement.heat}
                    </td>
                    <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                      <div className="space-y-1">
                        <p>Vekt: {measurement.measuredWeight} kg</p>
                        <p>Nullpunkt: {measurement.nullPoint}</p>
                        <p>Vekt/Effekt: {calculateWeightPowerRatio(measurement.measuredWeight, measurement.declaration.declaredPower) || "-"} kg/hk</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(measurement.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: nb })}
                        </p>
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top text-xs text-gray-900 md:px-4 md:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`h-4 w-4 rounded-full ${isWithinLimit(
                          calculateWeightPowerRatio(measurement.measuredWeight, measurement.declaration.declaredPower),
                          measurement.declaration.declaredClass,
                          measurement.declaration.declaredClass === "GT_PLUS"
                        ) ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{isWithinLimit(
                          calculateWeightPowerRatio(measurement.measuredWeight, measurement.declaration.declaredPower),
                          measurement.declaration.declaredClass,
                          measurement.declaration.declaredClass === "GT_PLUS"
                        ) ? 'OK' : 'Under grensen'}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}