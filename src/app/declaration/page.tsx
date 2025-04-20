"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import WeightAdditions from "@/components/WeightAdditions";
import { DeclarationClass } from "@prisma/client";
import { WEIGHT_ADDITIONS } from "@/config/weightAdditions";

const CLASS_LIMITS = {
  GT5: { ratio: 7.3, maxPower: 160 },
  GT4: { ratio: 4.9, maxPower: 250 },
  GT4_TURBO: { ratio: 5.5, maxPower: 250 },
  GT3: { ratio: 3.7, maxPower: 420 },
  GT3_TURBO: { ratio: 4.0, maxPower: 420 },
  GT1: { ratio: 2.5, maxPower: 800 },
  GT_PLUS: { ratio: 1.0, maxPower: 1500 },
} as const;

export default function DeclarationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declaredClass, setDeclaredClass] = useState<DeclarationClass | "">("");
  const [declaredPower, setDeclaredPower] = useState<number>(0);
  const [calculatedWeight, setCalculatedWeight] = useState<number>(0);
  const [powerError, setPowerError] = useState<string | null>(null);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [isTurbo, setIsTurbo] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const [startNumber, setStartNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Hook for å hente eksisterende selvangivelse
  const { data: existingDeclaration } = api.declaration.getByStartNumberAndClass.useQuery(
    {
      startNumber,
      declaredClass: declaredClass as DeclarationClass,
    },
    {
      enabled: !!startNumber && !!declaredClass,
    }
  );

  useEffect(() => {
    if (declaredClass && declaredPower > 0) {
      const classKey = isTurbo && (declaredClass === "GT4" || declaredClass === "GT3") 
        ? `${declaredClass}_TURBO` as keyof typeof CLASS_LIMITS
        : declaredClass as keyof typeof CLASS_LIMITS;
      
      const classData = CLASS_LIMITS[classKey];
      if (classData) {
        // Beregn basisvekt basert på klasse og effekt
        const baseWeight = Math.round(declaredPower * classData.ratio);
        
        // Beregn total vekt inkludert tilleggsvekter
        const additionsWeight = selectedAdditions.reduce((sum, additionId) => {
          const addition = WEIGHT_ADDITIONS[declaredClass]?.find((a: { id: string; weight: number }) => a.id === additionId);
          return sum + (addition?.weight ?? 0);
        }, 0);

        const totalWeight = baseWeight + additionsWeight;
        setCalculatedWeight(totalWeight);
        
        if (declaredPower > classData.maxPower) {
          setPowerError(`Maksimal tillatt effekt for ${declaredClass} er ${classData.maxPower} hk`);
        } else {
          setPowerError(null);
        }
      }
    }
  }, [declaredClass, declaredPower, isTurbo, selectedAdditions]);

  const submitDeclaration = api.declaration.submit.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setError(null);
      // Videresend e-posten til suksess-siden
      if (email) {
        router.push(`/declaration/success?email=${encodeURIComponent(email)}`);
      } else {
        router.push("/declaration/success");
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      startNumber: formData.get("startNumber") as string,
      email: formData.get("email") as string,
      car: {
        make: formData.get("make") as string,
        model: formData.get("model") as string,
        year: Number(formData.get("year")),
      },
      declaredWeight: calculatedWeight,
      declaredPower: Number(formData.get("declaredPower")),
      declaredClass: formData.get("declaredClass") as DeclarationClass,
      weightAdditions: selectedAdditions,
      isTurbo,
    };

    console.log("Sending declaration data:", data);

    if (existingDeclaration) {
      setFormData(data);
      setShowConfirmDialog(true);
      setIsSubmitting(false);
    } else {
      submitDeclaration.mutate(data as any);
    }
  };

  const handleConfirmSubmit = () => {
    if (formData) {
      submitDeclaration.mutate(formData as any);
      setShowConfirmDialog(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Selvangivelse</h1>
      
      {error && (
        <div className="mb-4 rounded bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Bilinformasjon */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Bilinformasjon</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Merke
              </label>
              <input
                type="text"
                name="make"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Modell
              </label>
              <input
                type="text"
                name="model"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                År
              </label>
              <input
                type="number"
                name="year"
                required
                min="1900"
                max={new Date().getFullYear()}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Selvangivelsesdata */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Selvangivelsesdata</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Startnummer
              </label>
              <input
                type="text"
                name="startNumber"
                required
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-post for kvittering
              </label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Du vil motta en e-postkvittering med detaljer om din selvangivelse
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Klasse
              </label>
              <select
                name="declaredClass"
                required
                value={declaredClass}
                onChange={(e) => setDeclaredClass(e.target.value as DeclarationClass)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Velg klasse</option>
                <option value="GT5">GT5 (7,3 kg/hk, max 160 hk)</option>
                <option value="GT4">GT4 (4,9 kg/hk, max 250 hk)</option>
                <option value="GT3">GT3 (3,7 kg/hk, max 420 hk)</option>
                <option value="GT1">GT1 (2,5 kg/hk, max 800 hk)</option>
                <option value="GT_PLUS">GT+ (1,0 kg/hk, max 1500 hk)</option>
              </select>
            </div>

            {(declaredClass === "GT4" || declaredClass === "GT3") && (
              <div className="flex items-center space-x-2">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isTurbo}
                    onChange={(e) => setIsTurbo(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Turbo
                  </span>
                </label>
                <span className="text-sm text-gray-500">
                  {isTurbo 
                    ? `(${declaredClass === "GT4" ? "5,5" : "4,0"} kg/hk)` 
                    : `(${declaredClass === "GT4" ? "4,9" : "3,7"} kg/hk)`}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Effekt (hk)
              </label>
              <input
                type="number"
                name="declaredPower"
                required
                min="0"
                step="0.1"
                value={declaredPower}
                onChange={(e) => setDeclaredPower(Number(e.target.value))}
                className={`mt-1 block w-full rounded-md border ${
                  powerError ? "border-red-500" : "border-gray-300"
                } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
              {powerError && (
                <p className="mt-1 text-sm text-red-600">
                  {powerError}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Vekt beregnes automatisk basert på klasse og effekt
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Beregnet vekt (kg)
              </label>
              <input
                type="number"
                value={calculatedWeight}
                readOnly
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-2 space-y-2">
                <div className="text-sm text-gray-600">
                  <p>Basis vekt/effekt-ratio: {CLASS_LIMITS[isTurbo && (declaredClass === "GT4" || declaredClass === "GT3") 
                    ? `${declaredClass}_TURBO` as keyof typeof CLASS_LIMITS
                    : declaredClass as keyof typeof CLASS_LIMITS]?.ratio ?? 0} kg/hk</p>
                  {selectedAdditions.length > 0 && (
                    <>
                      <p className="mt-1">
                        Personlig vekt/effekt-ratio: {(calculatedWeight / declaredPower).toFixed(2)} kg/hk
                      </p>
                      {(() => {
                        const classKey = isTurbo && (declaredClass === "GT4" || declaredClass === "GT3") 
                          ? `${declaredClass}_TURBO` as keyof typeof CLASS_LIMITS
                          : declaredClass as keyof typeof CLASS_LIMITS;
                        const classData = CLASS_LIMITS[classKey];
                        const personalRatio = calculatedWeight / declaredPower;
                        if (personalRatio < classData.ratio) {
                          return (
                            <p className="mt-1 text-red-600">
                              Advarsel: Personlig vekt/effekt-ratio er under klassen sin basis-ratio. 
                              Dette er ikke tillatt siden tilleggsvekt er straffevekt.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>
                <div className="group relative">
                  <span className="text-sm text-gray-500 cursor-help">
                    Hover for å se beregningsformel
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 hidden w-64 rounded-lg bg-gray-800 p-2 text-sm text-white group-hover:block">
                    <p>Beregning:</p>
                    <p>1. Basis vekt = Effekt (hk) × Klassens vekt/effekt-ratio</p>
                    <p>2. Total vekt = Basis vekt + Tilleggsvekt</p>
                    <p>3. Personlig vekt/effekt-ratio = Total vekt ÷ Effekt</p>
                    <p className="mt-1">Eksempel for GT4 Turbo:</p>
                    <p>Effekt: 210 hk</p>
                    <p>Basis vekt: 210 hk × 5,5 kg/hk = 1155 kg</p>
                    <p>Tilleggsvekt: 35 kg</p>
                    <p>Total vekt: 1155 kg + 35 kg = 1190 kg</p>
                    <p>Personlig ratio: 1190 kg ÷ 210 hk = 5,67 kg/hk</p>
                    <p className="mt-2 text-yellow-400">Merk: Personlig vekt/effekt-ratio må være høyere enn eller lik klassen sin basis-ratio når tilleggsvekt brukes.</p>
                  </div>
                </div>
              </div>
            </div>

            {declaredClass && (
              <WeightAdditions
                declaredClass={declaredClass}
                selectedAdditions={selectedAdditions}
                onChange={setSelectedAdditions}
              />
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !declaredClass || !declaredPower || !!powerError}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Sender inn..." : "Send inn selvangivelse"}
          </button>
        </div>
      </form>

      {/* Bekreftelsesdialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-semibold">Bekreft overskriving</h2>
            <p className="mb-4">
              Det finnes allerede en selvangivelse for dette startnummeret og klassen. 
              Vil du overskrive den eksisterende selvangivelsen?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Overskriv
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 