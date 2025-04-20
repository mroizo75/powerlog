"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import WeightAdditions from "./WeightAdditions";
import { DeclarationClass, CLASS_LIMITS, type DeclarationClassType } from "@/types/declaration";

type HeatType = "Trening" | "Kval" | "Finale 1" | "Finale 2" | "Finale 3" | "Finale 4";

export default function WeightRegistration() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<DeclarationClassType | null>(null);
  const [startNumber, setStartNumber] = useState("");
  const [weight, setWeight] = useState("");
  const [boxId, setBoxId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [declaration, setDeclaration] = useState<any>(null);
  const [isLoadingDeclaration, setIsLoadingDeclaration] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [measuredWeight, setMeasuredWeight] = useState("");
  const [heat, setHeat] = useState<HeatType | "">("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingWeightData, setPendingWeightData] = useState<{
    declarationId: string;
    measuredWeight: number;
    heat?: HeatType;
    powerlogId?: string;
  } | null>(null);
  const [declaredClass, setDeclaredClass] = useState<DeclarationClassType>(DeclarationClass.GT3);
  const [declaredWeight, setDeclaredWeight] = useState<number | null>(null);
  const [declaredPower, setDeclaredPower] = useState<number | null>(null);
  const [isTurbo, setIsTurbo] = useState(false);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);

  const { mutate: submitWeight, isPending: isSubmitting } = api.weight.submit.useMutation({
    onSuccess: () => {
      setSuccess("Vektmåling registrert!");
      setError("");
      // Reset form
      setStartNumber("");
      setWeight("");
      setBoxId("");
      setDeclaration(null);
      setShowWarning(false);
      setShowConfirmDialog(false);
      setPendingWeightData(null);
    },
    onError: (error) => {
      setError(error.message);
      setSuccess("");
    },
  });

  const { mutate: generateReport, isPending: isGeneratingReport } = api.report.create.useMutation({
    onSuccess: () => {
      setSuccess("Rapport generert og sendt til admin!");
      setError("");
    },
    onError: (error) => {
      setError(error.message);
      setSuccess("");
    },
  });

  const utils = api.useUtils();

  // Konverter klasse til API-format
  const convertClassToApiFormat = (classStr: string): "GT5" | "GT4" | "GT3" | "GT1" | "GT_PLUS" | "OTHER" => {
    switch (classStr) {
      case "GT 1":
        return "GT1";
      case "GT 3":
        return "GT3";
      case "GT 4":
        return "GT4";
      case "GT 5":
        return "GT5";
      case "GT+":
        return "GT_PLUS";
      default:
        return "OTHER";
    }
  };

  const { data: declarationData, refetch: refetchDeclaration } = api.declaration.getByStartNumberAndClass.useQuery(
    {
      startNumber,
      declaredClass: selectedClass ? convertClassToApiFormat(selectedClass) : "OTHER",
    },
    {
      enabled: false, // Ikke kjør spørringen automatisk
    }
  );

  const handleFindDeclaration = async () => {
    if (!startNumber || !selectedClass) return;
    
    setIsLoadingDeclaration(true);
    try {
      const result = await refetchDeclaration();
      
      if (result.data) {
        setDeclaration(result.data);
        setMeasuredWeight(result.data.declaredWeight?.toString() || "0");
        
        // Prøv å hente boxId fra boxlog
        try {
          const boxlogResult = await utils.boxlog.getByStartNumber.fetch(startNumber);
          if (boxlogResult) {
            setBoxId(boxlogResult.boxId);
          }
        } catch (error) {
          // Hvis ingen boxlog finnes, fortsett uten å sette boxId
          console.log("Ingen boxlog funnet for dette startnummeret");
        }
      } else {
        setError("Ingen selvangivelse funnet for dette startnummeret og klassen");
      }
    } catch (error) {
      console.error("Feil ved henting av selvangivelse:", error);
      setError("Kunne ikke hente selvangivelse. Sjekk at startnummer og klasse er korrekt.");
    } finally {
      setIsLoadingDeclaration(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaration || !measuredWeight) {
      setError("Vennligst fyll ut alle påkrevde felt");
      return;
    }

    const weight = parseFloat(measuredWeight);

    if (isNaN(weight)) {
      setError("Vennligst fyll ut vekt");
      return;
    }

    const weightData = {
      declarationId: declaration.id,
      measuredWeight: weight,
      heat: heat || undefined,
      powerlogId: boxId || undefined,
    };

    // Beregn vekt/effekt-ratio
    const actualRatio = weight / declaration.declaredPower;
    const declaredRatio = declaration.declaredWeight / declaration.declaredPower;

    if (actualRatio < declaredRatio) {
      setPendingWeightData(weightData);
      setWarningMessage(
        `Vekt/effekt-ratio (${actualRatio.toFixed(2)} kg/hk) er under bilens angitte ratio på ${declaredRatio.toFixed(2)} kg/hk. Dette vil generere en rapport.`
      );
      setShowWarning(true);
    } else {
      setPendingWeightData(weightData);
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmSubmit = () => {
    if (!pendingWeightData || !declaration) return;
    
    // Hvis vekt/effekt-ratio er under grensen, generer rapport først
    if (showWarning) {
      const actualRatio = pendingWeightData.measuredWeight / declaration.declaredPower;
      const requiredRatio = declaration.declaredWeight / declaration.declaredPower;
      
      const reportDetails = {
        measuredWeight: pendingWeightData.measuredWeight,
        declaredPower: declaration.declaredPower,
        ratio: actualRatio,
        requiredRatio: requiredRatio,
        carInfo: `${declaration.car.make} ${declaration.car.model} (${declaration.car.year})`,
        startNumber: declaration.startNumber,
      };

      // Sjekk at alle verdier er gyldige tall
      if (Object.values(reportDetails).some(val => 
        typeof val === 'number' && (isNaN(val) || !isFinite(val))
      )) {
        console.error("Ugyldige verdier i rapportdetaljer:", reportDetails);
        setError("Kunne ikke generere rapport på grunn av ugyldige verdier");
        return;
      }

      generateReport({
        type: "WEIGHT_POWER_RATIO",
        declarationId: pendingWeightData.declarationId,
        details: reportDetails,
        source: "WEIGHT",
      });
    }
    
    // Registrer vekt
    submitWeight(pendingWeightData);
  };

  return (
    <div className="px-4 py-5 sm:px-6">
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ← Tilbake til dashboard
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Klasse og Startnummer */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Klasse */}
          <div>
            <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">
              Klasse
            </label>
            <select
              id="class"
              value={selectedClass || ""}
              onChange={(e) => setSelectedClass(e.target.value as DeclarationClassType)}
              className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5 px-3 transition-colors duration-200"
              required
            >
              <option value="">Velg klasse</option>
              {Object.values(DeclarationClass).map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Startnummer */}
          <div>
            <label htmlFor="startNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Startnummer
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="startNumber"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5 px-3 transition-colors duration-200"
                required
                disabled={!!declaration}
                placeholder="Skriv inn startnummer"
              />
              <button
                type="button"
                onClick={handleFindDeclaration}
                disabled={isLoadingDeclaration || !selectedClass || !startNumber}
                className="inline-flex items-center px-4 py-2.5 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoadingDeclaration ? "Søker..." : "Finn selvangivelse"}
              </button>
            </div>
          </div>
        </div>

        {/* Vis selvangivelsesinformasjon */}
        {declaration && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Selvangivelse funnet
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Bil: {declaration.car.make} {declaration.car.model} ({declaration.car.year})</p>
                  {declaration.declaredWeight && (
                    <p>Angitt vekt: {declaration.declaredWeight} kg</p>
                  )}
                  {declaration.declaredPower && (
                    <p>Angitt effekt: {declaration.declaredPower} hk</p>
                  )}
                  {declaration.isTurbo && (
                    <p className="text-blue-900 font-medium">Turbo-variant</p>
                  )}
                  {declaration.weightAdditions && declaration.weightAdditions.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800 font-medium">⚠️ Bil med tilleggsvekt</p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Denne bilen har {declaration.weightAdditions.length} tilleggsvekt(er) og må følge sin personlige vekt/effekt-faktor
                      </p>
                    </div>
                  )}
                  {declaration.declaredWeight && declaration.declaredPower && (
                    <div className="mt-2">
                      <span className="font-medium text-blue-900">Angitt vekt/effekt-ratio:</span>{" "}
                      {(() => {
                        const classData = CLASS_LIMITS[selectedClass as DeclarationClassType];
                        if (!classData) return null;
                        const declaredRatio = declaration.declaredWeight / declaration.declaredPower;
                        const requiredRatio = declaration.isTurbo && (selectedClass === "GT 4" || selectedClass === "GT 3")
                          ? classData.turboRatio ?? classData.ratio
                          : classData.ratio;
                        
                        // Hvis bilen har tilleggsvekt, bruk den personlige ratioen som minimum
                        const minimumRatio = declaration.weightAdditions && declaration.weightAdditions.length > 0
                          ? declaredRatio
                          : requiredRatio;
                        
                        const isWithinLimit = declaredRatio >= minimumRatio;
                        return (
                          <span className={isWithinLimit ? "text-green-600" : "text-red-600"}>
                            {declaredRatio.toFixed(2)} kg/hk
                            {declaration.weightAdditions && declaration.weightAdditions.length > 0 && (
                              <span className="ml-2 text-xs text-yellow-600">
                                (Personlig minimum: {minimumRatio.toFixed(2)} kg/hk)
                              </span>
                            )}
                            {!isWithinLimit && !declaration.weightAdditions && (
                              <span className="ml-2 text-xs">
                                (Minimum: {minimumRatio.toFixed(2)} kg/hk)
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vekt og Nullpunkt */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Vekt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Målt vekt (kg)
            </label>
            <input
              type="number"
              value={measuredWeight}
              onChange={(e) => setMeasuredWeight(e.target.value)}
              className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5 px-3 transition-colors duration-200"
              required
              min="0"
              step="0.1"
              placeholder="0.0"
            />
          </div>
        </div>

        {/* Heat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heat
          </label>
          <select
            value={heat}
            onChange={(e) => setHeat(e.target.value as HeatType | "")}
            className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5 px-3 transition-colors duration-200"
          >
            <option value="">Velg heat (valgfritt)</option>
            <option value="Trening">Trening</option>
            <option value="Kval">Kval</option>
            <option value="Finale 1">Finale 1</option>
            <option value="Finale 2">Finale 2</option>
            <option value="Finale 3">Finale 3</option>
            <option value="Finale 4">Finale 4</option>
          </select>
        </div>

        {/* Box ID */}
        <div>
          <label htmlFor="boxId" className="block text-sm font-medium text-gray-700 mb-1">
            Box ID (valgfritt)
          </label>
          <input
            type="text"
            id="boxId"
            value={boxId}
            onChange={(e) => setBoxId(e.target.value)}
            className="block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base py-2.5 px-3 transition-colors duration-200"
            disabled={!declaration}
            placeholder="Skriv inn Box ID"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">{success}</div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting || !declaration}
            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Registrerer..." : "Registrer vekt"}
          </button>
        </div>
      </form>

      {showWarning && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Advarsel: Vekt/effekt-ratio utenfor grensen
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {warningMessage}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting || isGeneratingReport}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isSubmitting || isGeneratingReport ? "Håndterer..." : "OK - Generer rapport"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWarning(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bekreftelsesdialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Bekreft vektregistrering
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Er du sikker på at du vil registrere vekten på {measuredWeight} kg?
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Registrerer..." : "Ja, registrer vekt"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 