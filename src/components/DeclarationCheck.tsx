"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format, isWithinInterval } from "date-fns";
import { nb } from "date-fns/locale";
import React from "react";

export default function DeclarationCheck() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const utils = api.useUtils();

  // Hent nåværende år
  const currentYear = new Date().getFullYear();
  
  // Sjekk om en dato er fra inneværende sesong (1. januar til 31. desember)
  const isCurrentSeason = (date: Date) => {
    return isWithinInterval(date, {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    });
  };

  const { data: declarations, isLoading } = api.declaration.getAll.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0, // Alltid hent ferske data
  });

  // Invalider spørringer når komponenten monteres
  React.useEffect(() => {
    utils.declaration.getAll.invalidate();
    utils.car.getAll.invalidate();
  }, [utils]);

  const filteredDeclarations = declarations?.filter((declaration) => {
    const matchesSearch = declaration.startNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      declaration.car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      declaration.car.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !selectedClass || declaration.declaredClass === selectedClass;
    
    return matchesSearch && matchesClass;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <input
            type="text"
            placeholder="Søk etter startnummer, merke eller modell..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Alle klasser</option>
            <option value="GT5">GT5</option>
            <option value="GT4">GT4</option>
            <option value="GT3">GT3</option>
            <option value="GT1">GT1</option>
            <option value="GT_PLUS">GT+</option>
            <option value="OTHER">Annet</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                Klasse
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Selvangivelsesvekt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Selvangivelseseffekt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Registrert
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredDeclarations?.map((declaration) => {
              const declarationDate = new Date(declaration.createdAt);
              const isCurrent = isCurrentSeason(declarationDate);

              return (
                <tr key={declaration.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {declaration.startNumber}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {declaration.car.make} {declaration.car.model} ({declaration.car.year})
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {declaration.declaredClass}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {declaration.declaredWeight} kg
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {declaration.declaredPower} hk
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {format(declarationDate, "dd.MM.yyyy HH:mm", { locale: nb })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {isCurrent ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Gammel
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 