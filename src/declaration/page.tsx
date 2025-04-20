import React, { useState } from "react";

// Definerer enum for DeclarationClass
enum DeclarationClass {
  STREET = "STREET",
  MODIFIED = "MODIFIED",
  UNLIMITED = "UNLIMITED",
  RACE = "RACE"
}

const DeclarationPage: React.FC = () => {
  const [startNumber, setStartNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Legger til manglende tilstandsvariabler
  const [calculatedWeight, setCalculatedWeight] = useState<number>(0);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [isTurbo, setIsTurbo] = useState<boolean>(false);

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

    try {
      // Send data to server
      const response = await fetch("/api/declare", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Handle successful submission
        console.log("Declaration successful");
      } else {
        // Handle error
        console.error("Declaration failed");
        setError("Declaration failed. Please try again later.");
      }
    } catch (err) {
      console.error("Error submitting declaration:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* ... existing form content ... */}

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
        {/* ... existing code ... */}
      </div>
    </div>
  );
};

export default DeclarationPage; 