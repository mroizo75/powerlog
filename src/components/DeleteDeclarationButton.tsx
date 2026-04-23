'use client';

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'link' ? (
          <button className="text-red-600 transition-colors hover:text-red-900">
            Slett
          </button>
        ) : (
          <button className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">
            Slett selvangivelse
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slett selvangivelse?</DialogTitle>
          <DialogDescription>
            Dette vil permanent slette selvangivelsen og alle tilhørende data (vektmålinger, rapporter, powerlog-målinger). Denne handlingen kan ikke angres.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleteDeclaration.isPending}>
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteDeclaration.isPending}
          >
            {deleteDeclaration.isPending ? "Sletter..." : "Ja, slett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
