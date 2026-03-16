"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

export default function WeightRegForm() {
  const [startNumber, setStartNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  // Hent selvangivelse basert på startnummer
  const { data: declaration, refetch: refetchDeclaration } = api.declaration.getByStartNumber.useQuery(
    startNumber,
    { enabled: !!startNumber }
  );

  // Hent vektmålinger for selvangivelsen
  const { data: measurements, refetch: refetchMeasurements } = api.weight.getByDeclarationId.useQuery(
    declaration?.id ?? "",
    { enabled: !!declaration?.id }
  );

  const submitMeasurement = api.weight.submit.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setError(null);
      void refetchDeclaration();
      void refetchMeasurements();
    },
    onError: (error) => {
      setIsSubmitting(false);
      setError(error.message);
    },
  });

  const calculateRatio = api.weight.calculateWeightPowerRatio.useQuery(
    {
      declarationId: declaration?.id ?? "",
      measuredWeight: Number(document.querySelector<HTMLInputElement>('input[name="measuredWeight"]')?.value ?? 0),
    },
    { enabled: !!declaration?.id }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!declaration) {
      setError("Ingen selvangivelse funnet for dette startnummeret");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      declarationId: declaration.id,
      measuredWeight: Number(formData.get("measuredWeight")),
      nullPoint: Number(formData.get("nullPoint")),
      powerlogId: formData.get("powerlogId") as string,
      measuredById: session?.user?.id ?? "",
    };

    submitMeasurement.mutate(data);
  };

  return (
    <>
      {/* Søk etter selvangivelse */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700">
          Søk etter startnummer
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Skriv inn startnummer"
          />
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      {/* Vis selvangivelse hvis funnet */}
      {declaration && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow"
        >
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Selvangivelse</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Bil</p>
              <p className="font-medium text-gray-900">
                {declaration.car.make} {declaration.car.model} ({declaration.car.year})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Klasse</p>
              <p className="font-medium text-gray-900">{declaration.declaredClass}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Angitt effekt</p>
              <p className="font-medium text-gray-900">{declaration.declaredPower} hk</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Angitt vekt</p>
              <p className="font-medium text-gray-900">{declaration.declaredWeight} kg</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Vektmålingsskjema */}
      {declaration && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 bg-white p-6 shadow"
        >
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Registrer vektmåling</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Målt vekt (kg)
                </label>
                <input
                  type="number"
                  name="measuredWeight"
                  required
                  min="0"
                  step="0.1"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nullpunkt
                </label>
                <input
                  type="number"
                  name="nullPoint"
                  required
                  min="0"
                  step="0.1"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Powerlog ID
                </label>
                <input
                  type="text"
                  name="powerlogId"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Beregningsvisning */}
            {calculateRatio.data && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow"
              >
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Beregning</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500">Vekt/Effekt-ratio</p>
                    <p className={`font-medium ${calculateRatio.data.isWithinLimit ? "text-green-600" : "text-red-600"}`}>
                      {calculateRatio.data.weightPowerRatio?.toFixed(2) ?? "-"} kg/hk
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Klassgrense</p>
                    <p className="font-medium text-gray-900">
                      {calculateRatio.data.classLimit} kg/hk
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className={`font-medium ${calculateRatio.data.isWithinLimit ? "text-green-600" : "text-red-600"}`}>
                      {calculateRatio.data.isWithinLimit ? "Innenfor grense" : "Over grense"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? "Sender inn..." : "Send inn måling"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}
    </>
  );
} 