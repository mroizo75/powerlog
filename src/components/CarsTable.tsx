"use client";

import Link from "next/link";
import { format, isWithinInterval } from "date-fns";
import { nb } from "date-fns/locale";
import { useState } from "react";
import NewCarModal from "@/components/NewCarModal";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  registration: string | null;
  declarations: {
    id: string;
    startNumber: string;
    createdAt: Date;
    declaredClass: string;
    declaredWeight: number | null;
    declaredPower: number | null;
    isTurbo: boolean;
  }[];
}

interface CarsTableProps {
  cars: Car[];
}

export default function CarsTable({ cars }: CarsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const deleteDeclaration = api.declaration.delete.useMutation({
    onSuccess: () => {
      toast.success("Selvangivelsen ble slettet");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const router = useRouter();

  // Hent nåværende år
  const currentYear = new Date().getFullYear();
  
  // Sjekk om en dato er fra inneværende sesong (1. januar til 31. desember)
  const isCurrentSeason = (date: Date) => {
    return isWithinInterval(date, {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    });
  };

  const handleDeleteDeclaration = async (declarationId: string) => {
    if (window.confirm("Er du sikker på at du vil slette denne selvangivelsen?")) {
      await deleteDeclaration.mutateAsync(declarationId);
    }
  };

  // Filtrer bort biler uten selvangivelse
  const carsWithDeclarations = cars?.filter(car => car.declarations && car.declarations.length > 0) || [];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Biler</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Legg til ny bil
        </button>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Biloversikt
          </h3>
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
                {carsWithDeclarations.map((car) => {
                  // Finn siste selvangivelse
                  const lastDeclaration = car.declarations!.reduce((latest, current) => 
                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                  );

                  return (
                    <tr key={car.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {lastDeclaration.startNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {lastDeclaration.declaredClass}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {car.make} {car.model} ({car.year})
                        <br />
                        <span className="text-xs text-gray-500">
                          {car.registration || "Ikke registrert"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {lastDeclaration.declaredWeight || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {lastDeclaration.declaredPower || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(lastDeclaration.createdAt).toLocaleDateString("nb-NO")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <button
                          onClick={() => router.push(`/admin/cars/${car.id}`)}
                          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                        >
                          Se detaljer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewCarModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}