"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import AdminNav from "@/components/AdminNav";
import { api } from "@/trpc/react";

interface AuditValues {
  declaredWeight?: number;
  declaredPower?: number;
  declaredClass?: string;
  isTurbo?: boolean;
  weightAdditions?: string[];
  car?: { make: string; model: string; year: number };
}

const fieldLabels: Record<string, string> = {
  declaredWeight: "Vekt",
  declaredPower: "Effekt",
  declaredClass: "Klasse",
  isTurbo: "Turbo",
  weightAdditions: "Tilleggsvekter",
  car: "Bil",
};

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (key === "isTurbo") return value ? "Ja" : "Nei";
  if (key === "car" && typeof value === "object") {
    const car = value as { make: string; model: string; year: number };
    return `${car.make} ${car.model} (${car.year})`;
  }
  if (key === "weightAdditions" && Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Ingen";
  }
  if (key === "declaredWeight") return `${value} kg`;
  if (key === "declaredPower") return `${value} hk`;
  return String(value);
}

export default function AuditLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const startNumber = params.startNumber as string;
  const printRef = useRef<HTMLDivElement>(null);

  const { data: auditLogs, isLoading } = api.declaration.getAuditLog.useQuery(startNumber, {
    enabled: !!startNumber,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      session?.user?.role !== "ADMIN" &&
      session?.user?.role !== "TEKNISK"
    ) {
      router.push("/");
    }
  }, [status, session, router]);

  const handlePrint = () => {
    window.print();
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TEKNISK")
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="print:hidden">
        <AdminNav />
      </div>
      <main className="container mx-auto px-4 py-8" ref={printRef}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Endringslogg — Startnummer #{startNumber}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Alle endringer i selvangivelse for inneværende sesong
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 print:hidden"
          >
            Skriv ut
          </button>
        </div>

        <div className="hidden print:mb-4 print:block">
          <p className="text-sm text-gray-500">
            Utskrift generert: {format(new Date(), "dd.MM.yyyy 'kl.' HH:mm", { locale: nb })}
          </p>
        </div>

        {(!auditLogs || auditLogs.length === 0) && (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">Ingen endringslogg funnet for startnummer #{startNumber}</p>
          </div>
        )}

        {auditLogs && auditLogs.length > 0 && (
          <div className="space-y-4">
            {auditLogs.map((log) => {
              const newValues = JSON.parse(log.newValues) as AuditValues;
              const previousValues = log.previousValues
                ? (JSON.parse(log.previousValues) as AuditValues)
                : null;
              const changedFields = log.changedFields
                ? (JSON.parse(log.changedFields) as string[])
                : null;

              return (
                <div key={log.id} className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-4 flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          log.action === "CREATED"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {log.action === "CREATED" ? "Opprettet" : "Endret"}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {format(new Date(log.createdAt), "dd.MM.yyyy 'kl.' HH:mm:ss", { locale: nb })}
                      </span>
                    </div>
                    {log.submittedByEmail && (
                      <span className="text-sm text-gray-500">
                        {log.submittedByEmail}
                      </span>
                    )}
                  </div>

                  {log.action === "CREATED" && (
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                      {Object.entries(newValues).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-gray-500">{fieldLabels[key] ?? key}</p>
                          <p className="font-medium text-gray-900">{formatValue(key, value)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.action === "UPDATED" && changedFields && (
                    <div className="space-y-2">
                      {changedFields.map((field) => (
                        <div
                          key={field}
                          className="flex items-center gap-4 rounded-md bg-gray-50 px-3 py-2 text-sm"
                        >
                          <span className="w-28 shrink-0 font-medium text-gray-700">
                            {fieldLabels[field] ?? field}
                          </span>
                          <span className="text-red-600 line-through">
                            {previousValues
                              ? formatValue(field, previousValues[field as keyof AuditValues])
                              : "-"}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-green-700">
                            {formatValue(field, newValues[field as keyof AuditValues])}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
