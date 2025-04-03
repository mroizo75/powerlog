'use client';

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

interface DeleteDeclarationButtonProps {
  declarationId: string;
  carId: string;
  variant?: 'button' | 'link';
}

export default function DeleteDeclarationButton({ declarationId, carId, variant = 'button' }: DeleteDeclarationButtonProps) {
  const router = useRouter();
  const deleteDeclaration = api.declaration.delete.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
    onError: (error) => {
      console.error("Feil ved sletting av selvangivelse:", error);
      alert(error.message);
    },
  });

  const handleDelete = async () => {
    if (window.confirm('Er du sikker på at du vil slette denne selvangivelsen?')) {
      try {
        await deleteDeclaration.mutate(declarationId);
      } catch (error) {
        console.error("Feil ved sletting av selvangivelse:", error);
      }
    }
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleDelete}
        className="text-red-600 hover:text-red-900"
      >
        Slett
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Slett selvangivelse
    </button>
  );
} 