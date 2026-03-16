"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Document, Page, Text, View, StyleSheet, PDFViewer } from "@react-pdf/renderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PDFViewerWrapper from "./PDFViewerWrapper";
import ReportPDF from "./ReportPDF";

interface ReportDetails {
  measuredWeight: number;
  declaredPower: number;
  ratio: number;
  requiredRatio: number;
  carInfo: string;
  startNumber: string;
  measuredPower?: number;
  boxId?: string;
  heatNumber?: string;
  nullPoint?: number;
  effectivePower?: number;
  actualRatio?: number;
}

// PDF-stiler
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  bold: {
    fontWeight: "bold",
  },
  table: {
    display: "flex",
    flexDirection: "column",
    marginTop: 10,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    padding: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
  },
  errorBox: {
    margin: 10,
    padding: 10,
    backgroundColor: "#FFE4E4",
    borderWidth: 1,
    borderColor: "#FF0000",
    borderRadius: 5,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#CC0000",
    marginBottom: 5,
  },
});

export default function ReportDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const [resolutionComment, setResolutionComment] = useState("");
  const [isResolutionDialogOpen, setIsResolutionDialogOpen] = useState(false);
  const [reportToResolve, setReportToResolve] = useState<any>(null);
  const [reportStats, setReportStats] = useState<Record<string, any>>({});
  const [viewingStats, setViewingStats] = useState(false);
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [isJuryDialogOpen, setIsJuryDialogOpen] = useState(false);
  const [reportToJury, setReportToJury] = useState<any>(null);
  const [juryComment, setJuryComment] = useState("");
  const [reportsWithJuryInfo, setReportsWithJuryInfo] = useState<Record<string, { sentToJury: boolean, juryComment: string }>>({});
  const [pdfReport, setPdfReport] = useState<{ report: any; details: ReportDetails; declaration?: any } | null>(null);
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");

  const { data: reports, isLoading } = api.report.getAll.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  const { data: archivedReports, isLoading: isArchivedLoading } = api.report.getArchived.useQuery(undefined, {
    enabled: activeTab === "archive",
  });

  const archiveReport = api.report.archive.useMutation({
    onSuccess: () => {
      void utils.report.getAll.invalidate();
      void utils.report.getArchived.invalidate();
    },
  });

  const archiveAllReports = api.report.archiveAll.useMutation({
    onSuccess: () => {
      void utils.report.getAll.invalidate();
      void utils.report.getArchived.invalidate();
      if (reports) {
        utils.report.getAll.setData(undefined, []);
      }
    },
  });

  const updateStatus = api.report.updateStatus.useMutation({
    onSuccess: () => {
      void utils.report.getAll.invalidate();
      setIsResolutionDialogOpen(false);
      setResolutionComment("");
      setReportToResolve(null);
    },
  });

  const { data: carReportStats, isLoading: isStatsLoading } = api.report.getCarStats.useQuery(undefined, {
    enabled: viewingStats
  });

  const { data: declarationData } = api.declaration.getById.useQuery(declarationId || "", {
    enabled: !!declarationId,
  });

  const updateJuryStatus = (reportId: string, sentToJury: boolean, comment?: string) => {
    setReportsWithJuryInfo((prev) => ({
      ...prev,
      [reportId]: {
        sentToJury,
        juryComment: comment || "",
      },
    }));
    setIsJuryDialogOpen(false);
    setJuryComment("");
    setReportToJury(null);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEKNISK") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (carReportStats) {
      setReportStats(carReportStats);
    }
  }, [carReportStats]);

  useEffect(() => {
    if (declarationData && declarationId) {
      setPdfReport((prev) => prev ? { ...prev, declaration: declarationData } : null);
      setDeclarationId(null);
    }
  }, [declarationData, declarationId]);

  const openResolutionDialog = (report: any) => {
    setReportToResolve(report);
    setIsResolutionDialogOpen(true);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: "resolved" | "rejected", comment?: string) => {
    await updateStatus.mutate({
      id: reportId,
      status: newStatus,
      resolution: comment || undefined
    });
  };

  const handleResolve = () => {
    if (reportToResolve) {
      handleStatusUpdate(reportToResolve.id, "resolved", resolutionComment);
    }
  };

  const parseReportDetails = (details: any): ReportDetails | null => {
    try {
      // Hvis details er en streng, prøv å parse den som JSON
      if (typeof details === 'string') {
        const parsed = JSON.parse(details);
        if (parsed && typeof parsed === 'object') {
          return {
            ...parsed,
            boxId: parsed.boxId,
            heatNumber: parsed.heatNumber,
            nullPoint: parsed.nullPoint,
            measuredPower: parsed.measuredPower,
          } as ReportDetails;
        }
      }
      // Hvis details allerede er et objekt, returner det direkte
      else if (details && typeof details === 'object') {
        return {
          ...details,
          boxId: details.boxId,
          heatNumber: details.heatNumber,
          nullPoint: details.nullPoint,
          measuredPower: details.measuredPower,
        } as ReportDetails;
      }
      return null;
    } catch (e) {
      console.error('Kunne ikke parse rapportdetaljer:', e);
      return null;
    }
  };

  const handleGeneratePDF = (report: any, details: ReportDetails) => {
    const reportWithJuryInfo = {
      ...report,
      sentToJury: isReportSentToJury(report.id),
      juryComment: getJuryComment(report.id),
    };
    
    // Oppdater detaljene med beregninger basert på kilden
    const isFromPowerlog = report.source === "POWERLOG";
    const effectivePower = details.effectivePower || 
                          (isFromPowerlog ? details.measuredPower || details.declaredPower : details.declaredPower);
    const actualRatio = details.actualRatio || (details.measuredWeight / effectivePower);
    
    const updatedDetails = {
      ...details,
      effectivePower, // Legg til effectivePower for å bruke i PDF
      actualRatio     // Legg til actualRatio for å bruke i PDF
    };
    
    setPdfReport({ report: reportWithJuryInfo, details: updatedDetails });
    setDeclarationId(report.declarationId);
  };

  const toggleStatsView = () => {
    setViewingStats(!viewingStats);
    if (!viewingStats) {
      setSelectedCar(null);
    }
  };

  const openJuryDialog = (report: any) => {
    setReportToJury(report);
    setJuryComment(reportsWithJuryInfo[report.id]?.juryComment || "");
    setIsJuryDialogOpen(true);
  };

  const handleJurySubmit = () => {
    if (reportToJury) {
      updateJuryStatus(reportToJury.id, true, juryComment);
    }
  };

  // Helper for å sjekke om en rapport er sendt til jury
  const isReportSentToJury = (reportId: string) => {
    return reportsWithJuryInfo[reportId]?.sentToJury || false;
  };

  // Helper for å hente jury-kommentaren til en rapport
  const getJuryComment = (reportId: string) => {
    return reportsWithJuryInfo[reportId]?.juryComment || "";
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TEKNISK")) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="w-full px-4 py-6">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const weightOutside = (details: ReportDetails, source: string) => {
    // Velg riktig effekt basert på rapportens kilde - for powerlog bare bruk målt effekt
    const isFromPowerlog = source === "POWERLOG";
    const effectivePower = isFromPowerlog 
      ? details.measuredPower // BARE målt effekt for powerlog
      : details.declaredPower; // Alltid deklarert effekt for vektreg
    
    if (!effectivePower) return 0; // Unngå division by zero
    
    // Beregn faktisk ratio basert på riktig effekt
    const actualRatio = details.measuredWeight / effectivePower;
    return ((details.measuredWeight / actualRatio) - (details.measuredWeight / details.requiredRatio)) * details.requiredRatio;
  };

  const percentOutside = (details: ReportDetails, source: string) => {
    // Velg riktig effekt basert på rapportens kilde - for powerlog bare bruk målt effekt
    const isFromPowerlog = source === "POWERLOG";
    const effectivePower = isFromPowerlog 
      ? details.measuredPower // BARE målt effekt for powerlog
      : details.declaredPower; // Alltid deklarert effekt for vektreg
    
    if (!effectivePower) return 0; // Unngå division by zero
    
    // Beregn faktisk ratio basert på riktig effekt
    const actualRatio = details.measuredWeight / effectivePower;
    return 100 - ((actualRatio / details.requiredRatio) * 100);
  };

  const isUnderLimit = (report: any, details: ReportDetails) => {
    const isFromPowerlog = report.source === "POWERLOG";
    const effectivePower = isFromPowerlog 
      ? details.measuredPower // BARE målt effekt for powerlog
      : details.declaredPower; // Alltid deklarert effekt for vektreg
    
    if (!effectivePower) return false; // Unngå division by zero
    
    const actualRatio = details.measuredWeight / effectivePower;
    return actualRatio < details.requiredRatio;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* PDF Modal */}
      {pdfReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative w-full h-full">
            <button
              onClick={() => setPdfReport(null)}
              className="absolute top-4 right-4 z-10 bg-red-500 text-white px-4 py-2 rounded"
            >
              Lukk
            </button>
            <div className="w-full h-full">
              <PDFViewer className="w-full h-full">
                <ReportPDF 
                  report={pdfReport.report} 
                  details={pdfReport.details} 
                  declaration={pdfReport.declaration}
                />
              </PDFViewer>
            </div>
          </div>
        </div>
      )}
      
      {/* Resolution Dialog */}
      <Dialog open={isResolutionDialogOpen} onOpenChange={setIsResolutionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Løs rapport</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Løsning:</p>
            <Textarea
              value={resolutionComment}
              onChange={(e) => setResolutionComment(e.target.value)}
              placeholder="Skriv din løsning her..."
              className="min-h-[120px]"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolutionDialogOpen(false)}>Avbryt</Button>
            <Button 
              variant="default" 
              onClick={handleResolve}
              disabled={!resolutionComment.trim()}>
              Løs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Jury Dialog */}
      <Dialog open={isJuryDialogOpen} onOpenChange={setIsJuryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send til jury</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Jury melding:</p>
            <Textarea
              value={juryComment}
              onChange={(e) => setJuryComment(e.target.value)}
              placeholder="Skriv din jury melding her..."
              className="min-h-[120px]"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsJuryDialogOpen(false)}>Avbryt</Button>
            <Button 
              variant="destructive" 
              onClick={handleJurySubmit}
              disabled={!juryComment.trim()}>
              Send til jury
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <main className="w-full px-4 py-6">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {viewingStats ? "Rapport statistikk" : activeTab === "active" ? "Aktive rapporter" : "Arkiverte rapporter"}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "active"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Aktive
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`px-4 py-2 rounded-md ${
                  activeTab === "archive"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Arkiv
              </button>
            </div>
          </div>
          <div className="flex space-x-2">
            {activeTab === "active" && reports && reports.length > 0 && (
              <button
                onClick={() => archiveAllReports.mutate()}
                className="rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
              >
                Arkiver alle
              </button>
            )}
            <Button onClick={toggleStatsView}>
              {viewingStats ? "Vis aktive" : "Vis statistikk"}
            </Button>
          </div>
        </div>

        {viewingStats ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-white shadow sm:rounded-lg"
          >
            {isStatsLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Rapporter per bil
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(reportStats).map(([carId, stats]: [string, any]) => (
                    <div 
                      key={carId}
                      className={`p-4 border rounded-lg cursor-pointer ${selectedCar === carId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => setSelectedCar(selectedCar === carId ? null : carId)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{stats.carInfo}</h4>
                        <span className="text-sm bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                          {stats.totalReports} rapporter
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Startnummer: {stats.startNumber}</p>
                      
                      {selectedCar === carId && (
                        <div className="mt-4 border-t pt-4">
                          <h5 className="font-medium mb-2">Rapport historikk</h5>
                          <ul className="space-y-2">
                            {stats.reports.map((report: any) => (
                              <li key={report.id} className="text-sm">
                                <div className="flex justify-between">
                                  <span>{format(new Date(report.createdAt), "dd.MM.yyyy", { locale: nb })}</span>
                                  <div className="flex gap-1">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      report.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : report.status === "resolved"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}>
                                      {report.status === "pending" ? "Venter" : report.status === "resolved" ? "Løst" : "Avvist"}
                                    </span>
                                    {isReportSentToJury(report.id) && (
                                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                        Sendt til jury
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {report.resolution && (
                                  <div className="mt-1 text-gray-600 bg-gray-50 p-2 rounded">
                                    {report.resolution}
                                  </div>
                                )}
                                {getJuryComment(report.id) && (
                                  <div className="mt-1 text-red-600 bg-red-50 p-2 rounded">
                                    Jury melding: {getJuryComment(report.id)}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {activeTab === "active" ? "Aktive rapporter" : "Arkiverte rapporter"}
                </h3>
              </div>
              <div className="border-t border-gray-200">
                <ul role="list" className="divide-y divide-gray-200">
                  {(activeTab === "active" ? reports : archivedReports)?.map((report) => {
                    const details = parseReportDetails(report.details);
                    if (!details) {
                      return (
                        <li key={report.id} className="px-4 py-4 sm:px-6">
                          <Alert variant="destructive">
                            <AlertDescription>
                              Kunne ikke vise detaljer
                            </AlertDescription>
                          </Alert>
                        </li>
                      );
                    }

                    // Bruk riktig effekt basert på rapportens kilde
                    const isFromPowerlog = report.source === "POWERLOG";
                    const effectivePower = isFromPowerlog 
                      ? details.measuredPower // BARE målt effekt for powerlog
                      : details.declaredPower; // Alltid deklarert effekt for vektreg
                    
                    // Hvis det er en powerlog-rapport men vi mangler målt effekt, vis en feilmelding
                    if (isFromPowerlog && !details.measuredPower) {
                      return (
                        <li key={report.id} className="px-4 py-4 sm:px-6">
                          <Alert variant="destructive">
                            <AlertDescription>
                              Mangler målt effekt for powerlog
                            </AlertDescription>
                          </Alert>
                        </li>
                      );
                    }
                    
                    // Beregn bare hvis vi har en gyldig effektverdi
                    const actualRatio = effectivePower ? details.measuredWeight / effectivePower : 0;
                    const weightOutsideValue = weightOutside(details, report.source);
                    const percentOutsideValue = percentOutside(details, report.source);
                    const isUnderLimitValue = isUnderLimit(report, details);

                    return (
                      <li key={report.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="ml-3">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900">
                                  {report.type === "WEIGHT_POWER_RATIO" && "Vekt/Effekt ratio"}
                                </p>
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    report.source === "WEIGHT"
                                      ? "bg-blue-100 text-blue-800"
                                      : report.source === "POWERLOG"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {report.source === "WEIGHT" ? "Vektreg" : report.source === "POWERLOG" ? "Powerlog" : "Ukjent"}
                                </span>
                                {isReportSentToJury(report.id) && (
                                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                    Sendt til jury
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                Generert: {format(new Date(report.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                              </p>
                              {report.type === "WEIGHT_POWER_RATIO" && (
                                <div className="mt-2 text-sm text-gray-600">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="font-medium">Kilde:</p>
                                      <p>{report.source === "POWERLOG" ? "Fra Powerlog" : "Fra vektreg"}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Beregninger basert på:</p>
                                      <p>{report.source === "POWERLOG" ? "Basert på målt" : "Basert på deklarert"}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Bil:</p>
                                      <p>{details.carInfo}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Startnummer:</p>
                                      <p>{details.startNumber}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Målt vekt:</p>
                                      <p>{details.measuredWeight} kg</p>
                                    </div>
                                    {!isFromPowerlog && (
                                      <div>
                                        <p className="font-medium">Deklarert effekt:</p>
                                        <p>{details.declaredPower} hk</p>
                                      </div>
                                    )}
                                    {isFromPowerlog && details.measuredPower && (
                                      <>
                                        <div>
                                          <p className="font-medium">Målt effekt:</p>
                                          <p>{details.measuredPower} hk</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Effekt avvik:</p>
                                          <p className={details.measuredPower > details.declaredPower ? 'text-red-600' : 'text-green-600'}>
                                            {((details.measuredPower - details.declaredPower) / details.declaredPower * 100).toFixed(2)}%
                                            ({details.measuredPower > details.declaredPower ? "+" : ""}{(details.measuredPower - details.declaredPower).toFixed(2)} hk)
                                          </p>
                                        </div>
                                      </>
                                    )}
                                    <div className="col-span-2">
                                      <p className="font-medium">Vekt/Effekt ratio detaljer:</p>
                                      <div className={`mt-1 p-2 rounded ${isUnderLimitValue ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                                        <p>Beregnet med: <span className="font-medium">{details.measuredPower ? "Basert på målt" : "Basert på deklarert"}</span></p>
                                        <p>Faktisk: <span className="font-bold">{actualRatio.toFixed(2)} kg/hk</span></p>
                                        <p>Krav: <span className="font-bold">{details.requiredRatio.toFixed(2)} kg/hk</span></p>
                                        <p className="text-sm mt-1">Vekt utenfor: <span className="font-bold">{weightOutsideValue.toFixed(2)} kg</span></p>
                                        <p className="text-sm mt-1">Prosent utenfor: <span className="font-bold">{percentOutsideValue.toFixed(2)}%</span></p>
                                        {report.source === "POWERLOG" && details.measuredPower && details.measuredPower > details.declaredPower && (
                                          <p className="text-sm mt-1 text-red-600">
                                            Målt effekt ({details.measuredPower.toFixed(2)} hk) er {((details.measuredPower - details.declaredPower) / details.declaredPower * 100).toFixed(2)}% høyere enn deklarert ({details.declaredPower.toFixed(2)} hk)
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {report.resolution && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                                  <p className="font-medium mb-1">Løsning:</p>
                                  <p>{report.resolution}</p>
                                </div>
                              )}
                              {getJuryComment(report.id) && (
                                <div className="mt-2 p-3 bg-red-50 rounded-md text-sm">
                                  <p className="font-medium mb-1">Jury melding:</p>
                                  <p>{getJuryComment(report.id)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            {activeTab === "active" && report.status === "pending" && (
                              <>
                                <button
                                  onClick={() => openResolutionDialog(report)}
                                  className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                                >
                                  Løs
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(report.id, "rejected")}
                                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                                >
                                  Avvis
                                </button>
                              </>
                            )}
                            {activeTab === "active" && !isReportSentToJury(report.id) && (
                              <button
                                onClick={() => openJuryDialog(report)}
                                className="rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500"
                              >
                                Send til jury
                              </button>
                            )}
                            <button
                              onClick={() => handleGeneratePDF(report, details)}
                              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                            >
                              Generer PDF
                            </button>
                            {activeTab === "active" && report.status !== "pending" && (
                              <button
                                onClick={() => archiveReport.mutate({ id: report.id })}
                                className="rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
                              >
                                Arkiver
                              </button>
                            )}
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                report.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : report.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {report.status === "pending" ? "Venter" : report.status === "resolved" ? "Løst" : "Avvist"}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
} 