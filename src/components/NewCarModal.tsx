import { useState } from "react";
import { api } from "@/trpc/react";
import { DeclarationClass } from "@prisma/client";

interface NewCarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  make: string;
  model: string;
  year: number;
  registration: string;
  startNumber: string;
  declaredClass: DeclarationClass;
  declaredWeight: number;
  declaredPower: number;
  isTurbo: boolean;
  email: string;
  weightAdditions: string[];
}

export default function NewCarModal({ isOpen, onClose }: NewCarModalProps) {
  const [formData, setFormData] = useState<FormData>({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    registration: "",
    startNumber: "",
    declaredClass: DeclarationClass.GT5,
    declaredWeight: 0,
    declaredPower: 0,
    isTurbo: false,
    email: "",
    weightAdditions: [],
  });

  const submitDeclaration = api.declaration.submit.useMutation({
    onSuccess: () => {
      onClose();
      setFormData({
        make: "",
        model: "",
        year: new Date().getFullYear(),
        registration: "",
        startNumber: "",
        declaredClass: DeclarationClass.GT5,
        declaredWeight: 0,
        declaredPower: 0,
        isTurbo: false,
        email: "",
        weightAdditions: [],
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitDeclaration.mutateAsync({
        startNumber: formData.startNumber,
        declaredClass: formData.declaredClass,
        declaredWeight: formData.declaredWeight,
        declaredPower: formData.declaredPower,
        isTurbo: formData.isTurbo,
        email: formData.email,
        weightAdditions: formData.weightAdditions,
        car: {
          make: formData.make,
          model: formData.model,
          year: formData.year,
          registration: formData.registration,
        },
      });
      onClose();
    } catch (error) {
      console.error("Feil ved oppretting av bil:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Legg til ny bil</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Lukk</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Merke</label>
              <input
                type="text"
                required
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Modell</label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">År</label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registrering</label>
              <input
                type="text"
                value={formData.registration}
                onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Startnummer</label>
              <input
                type="text"
                required
                value={formData.startNumber}
                onChange={(e) => setFormData({ ...formData, startNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-post</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Klasse</label>
              <select
                required
                value={formData.declaredClass}
                onChange={(e) => setFormData({ ...formData, declaredClass: e.target.value as DeclarationClass })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                {Object.values(DeclarationClass).map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vekt (kg)</label>
              <input
                type="number"
                value={formData.declaredWeight}
                onChange={(e) => setFormData({ ...formData, declaredWeight: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Effekt (hk)</label>
              <input
                type="number"
                value={formData.declaredPower}
                onChange={(e) => setFormData({ ...formData, declaredPower: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isTurbo}
                  onChange={(e) => setFormData({ ...formData, isTurbo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Turbo</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={submitDeclaration.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitDeclaration.isPending ? "Lagrer..." : "Lagre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 