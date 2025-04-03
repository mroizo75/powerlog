"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { WeightMeasurement } from "@prisma/client";

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
}

// Definer grenser for hver klasse
const CLASS_LIMITS: Record<string, { normal: number; turbo?: number }> = {
  "GT5": { normal: 7.3 },
  "GT4": { normal: 4.9, turbo: 5.5 },
  "GT3": { normal: 3.7, turbo: 4.0 },
  "GT1": { normal: 2.5 },
  "GT_PLUS": { normal: 1.0 },
  "OTHER": { normal: 8.5 },
};

export default function WeightList() {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedHeat, setSelectedHeat] = useState("");

  const { data: cars, isLoading } = api.car.getAll.useQuery();

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

  // Kombiner selvangivelser med vektmålinger og finn siste måling
  const weightList = cars?.flatMap(car => 
    car.declarations?.map(declaration => {
      const measurements = declaration.weightMeasurements || [];
      const lastMeasurement = measurements.length > 0 
        ? measurements.reduce((latest, current) => 
            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
          )
        : null;

      return {
        ...declaration,
        car,
        lastMeasurement,
        weightMeasurements: measurements,
        isTurbo: declaration.declaredClass === "GT_PLUS"
      };
    }) || []
  ).filter(item => 
    (!selectedClass || item.declaredClass === selectedClass) &&
    (!selectedHeat || item.lastMeasurement?.heat === selectedHeat)
  ) as (DeclarationWithCar & { lastMeasurement: WeightMeasurement | null })[];

  // Beregn vekt/effekt-faktor
  const calculateWeightPowerRatio = (weight: number | null, power: number | null) => {
    if (!weight || !power || power === 0) return null;
    return Number((weight / power).toFixed(2));
  };

  // Sjekk om vekt/effekt-forholdet er innenfor grensen
  const isWithinLimit = (ratio: number | null, className: string, isTurbo: boolean) => {
    if (!ratio) return false;
    const limits = CLASS_LIMITS[className];
    if (!limits) return false;
    
    const limit = isTurbo && limits.turbo ? limits.turbo : limits.normal;
    return ratio >= limit;
  };

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Vektliste
          </h3>
          <div className="flex space-x-4">
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
                  Selvangivelse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Siste vektmåling
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {weightList?.map((item) => {
                const ratio = item.lastMeasurement 
                  ? calculateWeightPowerRatio(item.lastMeasurement.measuredWeight, item.declaredPower)
                  : calculateWeightPowerRatio(item.declaredWeight, item.declaredPower);
                
                const isOk = isWithinLimit(ratio, item.declaredClass, item.isTurbo ?? false);

                return (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.startNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.declaredClass}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.car.make} {item.car.model} ({item.car.year})
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <p>Vekt: {item.declaredWeight || "-"} kg</p>
                        <p>Effekt: {item.declaredPower || "-"} hk</p>
                        <p>Vekt/Effekt: {calculateWeightPowerRatio(item.declaredWeight, item.declaredPower) || "-"} kg/hk</p>
                        <p className="text-xs text-gray-500">
                          Insendt: {format(new Date(item.createdAt), "dd.MM.yyyy", { locale: nb })}
                        </p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.lastMeasurement ? (
                        <div className="space-y-1">
                          <p>Vekt: {item.lastMeasurement.measuredWeight} kg</p>
                          <p>Nullpunkt: {item.lastMeasurement.nullPoint}</p>
                          <p>Heat: {item.lastMeasurement.heat || "-"}</p>
                          <p>Vekt/Effekt: {calculateWeightPowerRatio(item.lastMeasurement.measuredWeight, item.declaredPower) || "-"} kg/hk</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(item.lastMeasurement.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">Ingen målinger</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <div className={`h-4 w-4 rounded-full ${isOk ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{isOk ? 'OK' : 'Under grensen'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 