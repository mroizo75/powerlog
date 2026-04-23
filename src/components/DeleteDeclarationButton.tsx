'use client';

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteDeclarationButtonProps {
  declarationId: string;
  carId: string;
  variant?: 'button' | 'link';
}

export default function DeleteDeclarationButton({ declarationId, carId, variant = 'button' }: DeleteDeclarationButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const deleteDeclaration = api.declaration.delete.useMutation({
    onSuccess: () => {
      setOpen(false);
      toast.success("Selvangivelsen ble slettet");
      router.refresh();
    },
    onError: (error) => {
      setOpen(false);
      toast.error("Kunne ikke slette selvangivelsen", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    deleteDeclaration.mutate(declarationId);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === 'link' ? (
          <button className="text-red-600 hover:text-red-900 transition-colors">
            Slett
          </button>
        ) : (
          <button className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
            Slett selvangivelse
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slett selvangivelse?</AlertDialogTitle>
          <AlertDialogDescription>
            Dette vil permanent slette selvangivelsen og alle tilhørende data (vektmålinger, rapporter, powerlog-målinger). Denne handlingen kan ikke angres.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteDeclaration.isPending}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteDeclaration.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteDeclaration.isPending ? "Sletter..." : "Ja, slett"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
