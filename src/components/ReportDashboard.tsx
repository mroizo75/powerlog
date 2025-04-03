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

interface ReportDetails {
  measuredWeight: number;
  declaredPower: number;
  ratio: number;
  requiredRatio: number;
  carInfo: string;
  startNumber: string;
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
});

// PDF-rapport komponent
const ReportPDF = ({ report, details }: { report: any; details: ReportDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View>
        <Text style={styles.header}>Teknisk Rapport</Text>
        
        <View style={styles.section}>
          <Text style={styles.title}>Bilinformasjon</Text>
          <Text style={styles.text}>Bil: {details.carInfo}</Text>
          <Text style={styles.text}>Startnummer: {details.startNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Målinger</Text>
          <Text style={styles.text}>Målt vekt: {details.measuredWeight} kg</Text>
          <Text style={styles.text}>Deklarert effekt: {details.declaredPower} hk</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Vekt/Effekt-forhold</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.bold]}>Parameter</Text>
              <Text style={[styles.tableCell, styles.bold]}>Verdi</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Faktisk forhold</Text>
              <Text style={styles.tableCell}>{details.ratio.toFixed(2)} kg/hk</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Krav</Text>
              <Text style={styles.tableCell}>{details.requiredRatio.toFixed(2)} kg/hk</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Prosent av grense</Text>
              <Text style={styles.tableCell}>{((details.ratio / details.requiredRatio) * 100).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Utregning</Text>
          <Text style={styles.text}>
            Vekt/Effekt-forhold = Målt vekt / Deklarert effekt
          </Text>
          <Text style={styles.text}>
            {details.measuredWeight} kg / {details.declaredPower} hk = {details.ratio.toFixed(2)} kg/hk
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.text}>
            Rapport generert: {format(new Date(report.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
          </Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default function ReportDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: reports, isLoading } = api.report.getAll.useQuery();

  const updateStatus = api.report.updateStatus.useMutation({
    onSuccess: () => {
      void utils.report.getAll.invalidate();
    },
  });

  const [pdfReport, setPdfReport] = useState<{ report: any; details: ReportDetails } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (session?.user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const handleStatusUpdate = async (reportId: string, newStatus: "resolved" | "rejected") => {
    await updateStatus.mutate({
      id: reportId,
      status: newStatus,
    });
  };

  const parseReportDetails = (details: any): ReportDetails | null => {
    try {
      // Hvis details er en streng, prøv å parse den som JSON
      if (typeof details === 'string') {
        const parsed = JSON.parse(details);
        if (parsed && typeof parsed === 'object') {
          return parsed as ReportDetails;
        }
      }
      // Hvis details allerede er et objekt, returner det direkte
      else if (details && typeof details === 'object') {
        return details as ReportDetails;
      }
      return null;
    } catch (e) {
      console.error('Kunne ikke parse rapportdetaljer:', e);
      return null;
    }
  };

  const handleGeneratePDF = (report: any, details: ReportDetails) => {
    setPdfReport({ report, details });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {pdfReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative w-full h-full">
            <button
              onClick={() => setPdfReport(null)}
              className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded"
            >
              Lukk
            </button>
            <PDFViewer className="w-full h-full">
              <ReportPDF report={pdfReport.report} details={pdfReport.details} />
            </PDFViewer>
          </div>
        </div>
      )}
      
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Aktive rapporter
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <ul role="list" className="divide-y divide-gray-200">
                {reports?.map((report) => {
                  const details = parseReportDetails(report.details);
                  if (!details) {
                    return (
                      <li key={report.id} className="px-4 py-4 sm:px-6">
                        <Alert variant="destructive">
                          <AlertDescription>
                            Kunne ikke vise rapportdetaljer. Vennligst kontakt teknisk support.
                          </AlertDescription>
                        </Alert>
                      </li>
                    );
                  }

                  const isUnderLimit = details.ratio < details.requiredRatio;
                  const ratioPercentage = ((details.ratio / details.requiredRatio) * 100).toFixed(1);

                  return (
                    <li key={report.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {report.type === "WEIGHT_POWER_RATIO" && "Vekt/Effekt-ratio utenfor grenser"}
                            </p>
                            <p className="text-sm text-gray-500">
                              Opprettet: {format(new Date(report.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                            </p>
                            {report.type === "WEIGHT_POWER_RATIO" && (
                              <div className="mt-2 text-sm text-gray-600">
                                <div className="grid grid-cols-2 gap-4">
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
                                  <div>
                                    <p className="font-medium">Deklarert effekt:</p>
                                    <p>{details.declaredPower} hk</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="font-medium">Vekt/Effekt-forhold:</p>
                                    <div className={`mt-1 p-2 rounded ${isUnderLimit ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                                      <p>Faktisk: <span className="font-bold">{details.ratio.toFixed(2)} kg/hk</span></p>
                                      <p>Krav: <span className="font-bold">{details.requiredRatio.toFixed(2)} kg/hk</span></p>
                                      <p className="text-sm mt-1">({ratioPercentage}% av grensen)</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {report.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(report.id, "resolved")}
                                className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                              >
                                Løst
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(report.id, "rejected")}
                                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                              >
                                Avvist
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleGeneratePDF(report, details)}
                            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                          >
                            Generer PDF
                          </button>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              report.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : report.status === "resolved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {report.status === "pending"
                              ? "Venter"
                              : report.status === "resolved"
                              ? "Løst"
                              : "Avvist"}
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
      </main>
    </div>
  );
} 