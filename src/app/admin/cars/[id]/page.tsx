import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { api } from "@/trpc/server";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import AdminNav from "@/components/AdminNav";
import { DeclarationClass } from "@prisma/client";
import { revalidatePath } from "next/cache";
import DeleteDeclarationButton from "@/components/DeleteDeclarationButton";

// Definer grenser for hver klasse
const CLASS_LIMITS: Record<string, { normal: number; turbo?: number }> = {
  "GT5": { normal: 7.3 },
  "GT4": { normal: 4.9, turbo: 5.5 },
  "GT3": { normal: 3.7, turbo: 4.0 },
  "GT1": { normal: 2.5 },
  "GT_PLUS": { normal: 1.0 },
  "OTHER": { normal: 0.0 },
};

interface WeightMeasurement {
  id: string;
  createdAt: Date;
  measuredWeight: number;
  nullPoint: number;
  heat: string | null;
  metadata: string | null;
  measuredBy: {
    name: string | null;
  };
  declaration: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    carId: string;
    startNumber: string;
    declaredClass: DeclarationClass;
    declaredWeight: number | null;
    declaredPower: number | null;
    isTurbo: boolean;
    isActive: boolean;
  };
  powerlog?: {
    weight: number;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    declarationId: string;
    nullPoint: number;
    heatNumber: string;
    boxId: string;
    measuredPower: number | null;
  } | null;
  powerlogId: string | null;
}

interface WeightPowerRatioHistory {
  id: string;
  createdAt: Date;
  measuredWeight: number;
  declaredPower: number;
  ratio: number;
  requiredRatio: number;
  source: "weight" | "powerlog";
  measuredBy: {
    name: string | null;
  };
  declarationId: string;
  declarationStartNumber: string;
  declarationClass: string;
  declarationDate: Date;
  isTurbo: boolean;
  totalAdditionalWeight: number;
  isWithinLimit: boolean;
}

interface Declaration {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  startNumber: string;
  declaredClass: DeclarationClass;
  declaredWeight: number | null;
  declaredPower: number | null;
  isTurbo: boolean;
  isActive: boolean;
  weightAdditions: {
    id: string;
    additionId: string;
    weight: number;
    declarationId: string;
  }[];
  carId: string;
  weightMeasurements: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    declarationId: string;
    carId: string;
    measuredWeight: number;
    nullPoint: number;
    powerlogId: string | null;
    measuredById: string;
    heat: string | null;
    metadata: string | null;
    measuredBy: {
      name: string | null;
    };
  }[];
}

export default async function CarDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const car = await api.car.getById(resolvedParams.id);
  const weightMeasurements = await api.weight.getByCarId(resolvedParams.id);
  const reports = await api.report.getAll();

  if (!car) {
    return null;
  }

  // Finn siste selvangivelse
  const lastDeclaration: Declaration | null = car.declarations && car.declarations.length > 0
    ? car.declarations
        .filter(d => d.isActive) // Kun bruk aktive selvangivelser
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null
    : null;

  // Beregn total tilleggsvekt
  const getTotalAdditionalWeight = (declaration: Declaration | null) => {
    if (!declaration) return 0;
    return declaration.weightAdditions?.reduce((sum, addition) => sum + addition.weight, 0) || 0;
  };

  // Beregn vekt/effekt-faktor
  const calculateWeightPowerRatio = (weight: number | null, power: number | null, className: string, isTurbo: boolean, additionalWeight: number = 0) => {
    if (!weight || !power || power === 0) return null;
    const totalWeight = weight + additionalWeight;
    return Number((totalWeight / power).toFixed(2));
  };

  // Sjekk om vekt/effekt-forholdet er innenfor grensen
  const isWithinLimit = (ratio: number | null, className: string, isTurbo: boolean) => {
    if (!ratio) return false;
    const limit = CLASS_LIMITS[className];
    if (!limit) return false;
    return ratio >= (isTurbo ? limit.turbo || limit.normal : limit.normal);
  };

  // Kombiner vektmålinger og rapporter til en historikk
  const weightPowerHistory: WeightPowerRatioHistory[] = [];

  // Legg til vektmålinger
  if (weightMeasurements) {
    weightMeasurements.forEach((measurement: WeightMeasurement) => {
      if (measurement.metadata) {
        const metadata = JSON.parse(measurement.metadata);
        const ratio = calculateWeightPowerRatio(
          measurement.measuredWeight,
          metadata.declaredPower,
          metadata.declaredClass,
          metadata.isTurbo,
          metadata.totalAdditionalWeight
        );

        if (ratio) {
          weightPowerHistory.push({
            id: measurement.id,
            createdAt: measurement.createdAt,
            measuredWeight: measurement.measuredWeight,
            declaredPower: metadata.declaredPower,
            ratio,
            requiredRatio: metadata.requiredRatio,
            source: "weight",
            measuredBy: measurement.measuredBy,
            declarationId: metadata.declarationId,
            declarationStartNumber: metadata.startNumber,
            declarationClass: metadata.declaredClass,
            declarationDate: new Date(metadata.declarationDate),
            isTurbo: metadata.isTurbo,
            totalAdditionalWeight: metadata.totalAdditionalWeight,
            isWithinLimit: metadata.isWithinLimit
          });
        }
      }
    });
  }

  // Sorter historikk etter dato (nyeste først)
  weightPowerHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {car.make} {car.model} ({car.year})
          </h1>
        </div>

        {/* Siste selvangivelse */}
        {lastDeclaration && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Siste selvangivelse</h2>
              <DeleteDeclarationButton declarationId={lastDeclaration.id} carId={car.id} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Startnummer</p>
                <p className="text-lg font-medium">{lastDeclaration.startNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Klasse</p>
                <p className="text-lg font-medium">{lastDeclaration.declaredClass}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selvangivelsesvekt</p>
                <p className="text-lg font-medium">{lastDeclaration.declaredWeight || "-"} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tilleggsvekt</p>
                <p className="text-lg font-medium">{getTotalAdditionalWeight(lastDeclaration)} kg</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selvangivelseseffekt</p>
                <p className="text-lg font-medium">{lastDeclaration.declaredPower || "-"} hk</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Turbo</p>
                <p className="text-lg font-medium">{lastDeclaration.isTurbo ? "Ja" : "Nei"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vekt/effekt-forhold</p>
                <p className="text-lg font-medium">
                  {calculateWeightPowerRatio(
                    lastDeclaration.declaredWeight, 
                    lastDeclaration.declaredPower,
                    lastDeclaration.declaredClass,
                    lastDeclaration.isTurbo,
                    getTotalAdditionalWeight(lastDeclaration)
                  ) || "-"} kg/hk
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`text-lg font-medium ${
                  isWithinLimit(
                    calculateWeightPowerRatio(
                      lastDeclaration.declaredWeight, 
                      lastDeclaration.declaredPower,
                      lastDeclaration.declaredClass,
                      lastDeclaration.isTurbo,
                      getTotalAdditionalWeight(lastDeclaration)
                    ),
                    lastDeclaration.declaredClass,
                    lastDeclaration.isTurbo
                  ) ? "text-green-600" : "text-red-600"
                }`}>
                  {isWithinLimit(
                    calculateWeightPowerRatio(
                      lastDeclaration.declaredWeight, 
                      lastDeclaration.declaredPower,
                      lastDeclaration.declaredClass,
                      lastDeclaration.isTurbo,
                      getTotalAdditionalWeight(lastDeclaration)
                    ),
                    lastDeclaration.declaredClass,
                    lastDeclaration.isTurbo
                  ) ? "Innenfor grense" : "Over grense"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alle selvangivelser */}
        {car.declarations && car.declarations.length > 0 && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Alle selvangivelser</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Dato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Startnummer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Klasse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tilleggsvekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Effekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Turbo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vekt/Effekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {car.declarations
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((declaration) => {
                      const totalAdditionalWeight = getTotalAdditionalWeight(declaration);
                      const ratio = calculateWeightPowerRatio(
                        declaration.declaredWeight,
                        declaration.declaredPower,
                        declaration.declaredClass,
                        declaration.isTurbo,
                        totalAdditionalWeight
                      );
                      
                      return (
                        <tr key={declaration.id}>
                          <td className="whitespace-nowrap px-6 py-4">
                            {format(new Date(declaration.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">{declaration.startNumber}</td>
                          <td className="whitespace-nowrap px-6 py-4">{declaration.declaredClass}</td>
                          <td className="whitespace-nowrap px-6 py-4">{declaration.declaredWeight || "-"} kg</td>
                          <td className="whitespace-nowrap px-6 py-4">{totalAdditionalWeight} kg</td>
                          <td className="whitespace-nowrap px-6 py-4">{declaration.declaredPower || "-"} hk</td>
                          <td className="whitespace-nowrap px-6 py-4">{declaration.isTurbo ? "Ja" : "Nei"}</td>
                          <td className="whitespace-nowrap px-6 py-4">{ratio?.toFixed(2) || "-"} kg/hk</td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <DeleteDeclarationButton 
                              declarationId={declaration.id} 
                              carId={car.id} 
                              variant="link" 
                            />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vekt/Effekt-forhold historikk */}
        {weightPowerHistory.length > 0 && (
          <div className="mb-8 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Vekt/Effekt-forhold historikk</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Dato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Målt vekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tilleggsvekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Effekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Forhold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Krav
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Selvangivelse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Målt av
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {weightPowerHistory.map((measurement) => (
                    <tr key={measurement.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        {format(new Date(measurement.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{measurement.measuredWeight} kg</td>
                      <td className="whitespace-nowrap px-6 py-4">{measurement.totalAdditionalWeight} kg</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {measurement.declaredPower} hk (Selvangivelse)
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{measurement.ratio.toFixed(2)} kg/hk</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {measurement.requiredRatio.toFixed(2)} kg/hk (Selvangivelse)
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          measurement.isWithinLimit
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {measurement.isWithinLimit ? "OK" : "Feil"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-xs">
                          <div>#{measurement.declarationStartNumber}</div>
                          <div className="text-gray-500">
                            {format(new Date(measurement.declarationDate), "dd.MM.yyyy", { locale: nb })}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">{measurement.measuredBy.name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Powerlog målinger */}
        {weightMeasurements && weightMeasurements.length > 0 && weightMeasurements.some(m => m.powerlogId) && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Powerlog målinger</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Dato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Målt effekt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vekt/Effekt-forhold
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Selvangivelse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Målt av
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {weightMeasurements
                    .filter(m => m.powerlogId)
                    .map((measurement: WeightMeasurement) => {
                      // Finn den gjeldende selvangivelsen for denne målingen
                      const currentDeclaration = car.declarations
                        ?.filter(d => new Date(d.createdAt) <= new Date(measurement.createdAt))
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

                      if (!currentDeclaration) return null;

                      // Beregn vekt/effekt-forhold for målingen
                      const ratio = calculateWeightPowerRatio(
                        measurement.measuredWeight,
                        measurement.powerlog?.measuredPower || 0,
                        currentDeclaration.declaredClass,
                        currentDeclaration.isTurbo,
                        getTotalAdditionalWeight(currentDeclaration)
                      ) || 0;

                      // Beregn vekt/effekt-forhold fra selvangivelsen
                      const declaredRatio = calculateWeightPowerRatio(
                        currentDeclaration.declaredWeight,
                        currentDeclaration.declaredPower,
                        currentDeclaration.declaredClass,
                        currentDeclaration.isTurbo,
                        getTotalAdditionalWeight(currentDeclaration)
                      ) || 0;

                      return (
                        <tr key={measurement.id}>
                          <td className="whitespace-nowrap px-6 py-4">
                            {format(new Date(measurement.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">{measurement.measuredWeight} kg</td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {measurement.powerlog?.measuredPower || "-"} hk
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            {ratio.toFixed(2)} kg/hk
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-xs">
                              <div>#{currentDeclaration.startNumber}</div>
                              <div className="text-gray-500">
                                {format(new Date(currentDeclaration.createdAt), "dd.MM.yyyy", { locale: nb })}
                              </div>
                              <div className="text-gray-500">
                                {declaredRatio.toFixed(2)} kg/hk
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              ratio >= declaredRatio
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {ratio >= declaredRatio ? "OK" : "Feil"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">{measurement.measuredBy.name || "-"}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}