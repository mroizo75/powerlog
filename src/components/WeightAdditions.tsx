import { DeclarationClass } from "@prisma/client";
import { WEIGHT_ADDITIONS } from "@/config/weightAdditions";

interface WeightAdditionsProps {
  declaredClass: DeclarationClass;
  selectedAdditions: string[];
  onChange: (additions: string[]) => void;
}

export default function WeightAdditions({ declaredClass, selectedAdditions, onChange }: WeightAdditionsProps) {
  const additions = WEIGHT_ADDITIONS[declaredClass];

  if (additions.length === 0) {
    return null;
  }

  const totalWeight = additions
    .filter(addition => selectedAdditions.includes(addition.id))
    .reduce((sum, addition) => sum + addition.weight, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Tillegsvekt</h3>
        <span className="text-sm text-gray-500">
          Totalt: {totalWeight} kg
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {additions.map((addition) => (
          <label key={addition.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedAdditions.includes(addition.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selectedAdditions, addition.id]);
                } else {
                  onChange(selectedAdditions.filter(id => id !== addition.id));
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-900">{addition.name}</span>
              <span className="text-xs text-gray-500">{addition.weight} kg</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
} 