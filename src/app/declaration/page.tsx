"use client";

import { useEffect, useMemo, useState } from "react";
import { DeclarationClass } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Gauge, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { CLASS_LIMITS, getRequiredRatio } from "@/config/classLimits";
import WeightAdditions from "@/components/WeightAdditions";
import { WEIGHT_ADDITIONS } from "@/config/weightAdditions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";

type DeclarationSubmitInput = {
  startNumber: string;
  email: string;
  car: {
    make: string;
    model: string;
    year: number;
  };
  declaredWeight: number;
  declaredPower: number;
  declaredClass: DeclarationClass;
  weightAdditions: string[];
  isTurbo: boolean;
};

const classOptions: Array<{
  value: DeclarationClass;
  label: string;
}> = [
  { value: "GT5", label: "GT5 (7,3 kg/hk, maks 160 hk)" },
  { value: "GT4", label: "GT4 (4,9 kg/hk, maks 250 hk)" },
  { value: "GT3", label: "GT3 (3,7 kg/hk, maks 420 hk)" },
  { value: "GT1", label: "GT1 (2,5 kg/hk, maks 800 hk)" },
  { value: "GT_PLUS", label: "GT+ (1,0 kg/hk, maks 1500 hk)" },
];

export default function DeclarationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declaredClass, setDeclaredClass] = useState<DeclarationClass | "">("");
  const [declaredPower, setDeclaredPower] = useState<string>("");
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [isTurbo, setIsTurbo] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<DeclarationSubmitInput | null>(null);
  const [startNumber, setStartNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [debouncedStartNumber, setDebouncedStartNumber] = useState<string>("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedStartNumber(startNumber.trim());
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [startNumber]);

  const { data: existingDeclaration } = api.declaration.getByStartNumberAndClass.useQuery(
    {
      startNumber: debouncedStartNumber,
      declaredClass: declaredClass as DeclarationClass,
    },
    {
      enabled: debouncedStartNumber.length >= 2 && !!declaredClass,
    },
  );

  const declaredPowerValue = declaredPower.trim() === "" ? 0 : Number(declaredPower);
  const hasValidPower = Number.isFinite(declaredPowerValue) && declaredPowerValue > 0;

  const classData = useMemo(() => {
    if (!declaredClass) {
      return null;
    }

    return CLASS_LIMITS[declaredClass];
  }, [declaredClass, isTurbo]);

  const additionsWeight = useMemo(() => {
    if (!declaredClass) {
      return 0;
    }

    return selectedAdditions.reduce((sum, additionId) => {
      const addition = WEIGHT_ADDITIONS[declaredClass].find((item) => item.id === additionId);
      return sum + (addition?.weight ?? 0);
    }, 0);
  }, [declaredClass, selectedAdditions]);

  const requiredRatio =
    declaredClass && classData ? getRequiredRatio(declaredClass, isTurbo) : 0;

  const baseWeight = classData && hasValidPower ? Math.round(declaredPowerValue * requiredRatio) : 0;
  const calculatedWeight = baseWeight + additionsWeight;

  const powerError =
    classData && hasValidPower && declaredPowerValue > classData.maxPower
      ? `Maksimal tillatt effekt for ${declaredClass} er ${classData.maxPower} hk`
      : null;

  const personalRatio =
    hasValidPower && calculatedWeight > 0 ? Number((calculatedWeight / declaredPowerValue).toFixed(2)) : null;

  const hasLowRatioWarning =
    classData && personalRatio !== null && selectedAdditions.length > 0 ? personalRatio < requiredRatio : false;

  const submitDeclaration = api.declaration.submit.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setError(null);
      if (email) {
        router.push(`/declaration/success?email=${encodeURIComponent(email)}`);
      } else {
        router.push("/declaration/success");
      }
    },
    onError: (mutationError) => {
      setIsSubmitting(false);
      setError(mutationError.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const yearValue = Number(formData.get("year"));
    const selectedClass = formData.get("declaredClass") as DeclarationClass;

    if (!hasValidPower || !selectedClass || !Number.isFinite(yearValue)) {
      setIsSubmitting(false);
      setError("Vennligst fyll ut gyldige verdier for du sender inn.");
      return;
    }

    const data: DeclarationSubmitInput = {
      startNumber: (formData.get("startNumber") as string).trim(),
      email: (formData.get("email") as string).trim(),
      car: {
        make: (formData.get("make") as string).trim(),
        model: (formData.get("model") as string).trim(),
        year: yearValue,
      },
      declaredWeight: calculatedWeight,
      declaredPower: declaredPowerValue,
      declaredClass: selectedClass,
      weightAdditions: selectedAdditions,
      isTurbo,
    };

    if (existingDeclaration) {
      setPendingSubmission(data);
      setShowConfirmDialog(true);
      setIsSubmitting(false);
      return;
    }

    submitDeclaration.mutate(data);
  };

  const handleConfirmSubmit = () => {
    if (!pendingSubmission) {
      return;
    }

    setIsSubmitting(true);
    submitDeclaration.mutate(pendingSubmission);
    setShowConfirmDialog(false);
    setPendingSubmission(null);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white p-5 shadow-sm sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Powerlog</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">Selvangivelse for bil</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
          Fyll ut informasjon om bil og klasse. Vekt beregnes automatisk basert på klasse, effekt og eventuelle
          tilleggsvekter.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Innsending feilet</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Bilinformasjon</CardTitle>
                <CardDescription>Grunnleggende data om bilen som skal deklareres.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <Label htmlFor="make">Merke</Label>
                  <Input id="make" name="make" required placeholder="f.eks. BMW" className="mt-2" />
                </div>

                <div className="sm:col-span-1">
                  <Label htmlFor="model">Modell</Label>
                  <Input id="model" name="model" required placeholder="f.eks. M3 E46" className="mt-2" />
                </div>

                <div className="sm:col-span-1">
                  <Label htmlFor="year">Arsmodell</Label>
                  <Input
                    id="year"
                    type="number"
                    name="year"
                    required
                    min="1900"
                    max={new Date().getFullYear()}
                    placeholder="f.eks. 2004"
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Deklarasjon</CardTitle>
                <CardDescription>Klasse, effekt og eventuelle tilleggsvekter.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="startNumber">Startnummer</Label>
                    <Input
                      id="startNumber"
                      type="text"
                      name="startNumber"
                      required
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      placeholder="f.eks. 504"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">E-post for kvittering</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="navn@epost.no"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 sm:text-sm">
                  Du vil motta en kvittering på e-post etter innsending.
                </div>

                <div>
                  <Label htmlFor="declaredClass">Klasse</Label>
                  <select
                    id="declaredClass"
                    name="declaredClass"
                    required
                    value={declaredClass}
                    onChange={(e) => setDeclaredClass(e.target.value as DeclarationClass)}
                    className="mt-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">Velg klasse</option>
                    {classOptions.map((classOption) => (
                      <option key={classOption.value} value={classOption.value}>
                        {classOption.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(declaredClass === "GT4" || declaredClass === "GT3") && (
                  <div className="rounded-lg border border-slate-200 p-3">
                    <label className="flex cursor-pointer items-center justify-between">
                      <span>
                        <p className="text-sm font-medium text-slate-900">Turbo</p>
                        <p className="text-xs text-slate-500">
                          {isTurbo
                            ? `Turbo-ratio aktiv (${declaredClass === "GT4" ? "5,5" : "4,0"} kg/hk)`
                            : `Standard-ratio aktiv (${declaredClass === "GT4" ? "4,9" : "3,7"} kg/hk)`}
                        </p>
                      </span>
                      <span className="relative inline-flex h-6 w-11 items-center">
                        <input
                          type="checkbox"
                          checked={isTurbo}
                          onChange={(e) => setIsTurbo(e.target.checked)}
                          className="peer sr-only"
                        />
                        <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-blue-600" />
                        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                      </span>
                    </label>
                  </div>
                )}

                <div>
                  <Label htmlFor="declaredPower">Effekt (hk)</Label>
                  <Input
                    id="declaredPower"
                    type="number"
                    name="declaredPower"
                    required
                    min="0"
                    step="0.1"
                    value={declaredPower}
                    onChange={(e) => setDeclaredPower(e.target.value)}
                    className={`mt-2 ${powerError ? "border-red-500 ring-red-500" : ""}`}
                    placeholder="f.eks. 210"
                  />
                  {powerError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{powerError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Vekt beregnes automatisk basert på klasse og effekt.</p>
                  )}
                </div>

                {declaredClass && (
                  <div className="rounded-lg border border-slate-200 p-4">
                    <WeightAdditions
                      declaredClass={declaredClass}
                      selectedAdditions={selectedAdditions}
                      onChange={setSelectedAdditions}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !declaredClass || !hasValidPower || !!powerError}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? "Sender inn..." : "Send inn selvangivelse"}
              </Button>
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-blue-600" />
                  Beregningsoversikt
                </CardTitle>
                <CardDescription>Oppdatert i sanntid mens du fyller ut.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Basis vekt</p>
                  <p className="text-lg font-semibold text-slate-900">{baseWeight} kg</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tilleggsvekt</p>
                  <p className="text-lg font-semibold text-slate-900">{additionsWeight} kg</p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-blue-700">Beregnet totalvekt</p>
                  <p className="text-2xl font-bold text-blue-900">{calculatedWeight} kg</p>
                </div>

                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    Klasse-ratio: <span className="font-semibold text-slate-900">{requiredRatio} kg/hk</span>
                  </p>
                  <p>
                    Personlig ratio:{" "}
                    <span className="font-semibold text-slate-900">
                      {personalRatio !== null ? `${personalRatio} kg/hk` : "-"}
                    </span>
                  </p>
                </div>

                {hasLowRatioWarning && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>For lav ratio</AlertTitle>
                    <AlertDescription>
                      Personlig vekt/effekt-ratio er under klassekravet. Juster effekt eller tilleggsvekt.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card className="hidden border-slate-200 lg:block">
              <CardHeader>
                <CardTitle>Slik beregnes vekten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <p>1) Basisvekt = Effekt (hk) x klasse-ratio</p>
                <p>2) Totalvekt = Basisvekt + tilleggsvekter</p>
                <p>3) Personlig ratio = Totalvekt / Effekt</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  Tilleggsvekt er straffevekt. Personlig ratio må være høyere enn eller lik klasse-ratio.
                </div>
              </CardContent>
            </Card>

            <Card className="hidden border-slate-200 lg:block">
              <CardContent className="space-y-3 p-6 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  Kvittering sendes på e-post etter innsending.
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Data valideres mot klassegrenser for registrering.
                </p>
                {existingDeclaration && (
                  <p className="flex items-center gap-2 font-medium text-amber-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Det finnes allerede en deklarasjon for denne kombinasjonen.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bekreft overskriving</DialogTitle>
            <DialogDescription>
              Det finnes allerede en selvangivelse for dette startnummeret og klassen. Vil du overskrive den
              eksisterende selvangivelsen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Avbryt
            </Button>
            <Button type="button" onClick={handleConfirmSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Overskriver..." : "Overskriv"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
