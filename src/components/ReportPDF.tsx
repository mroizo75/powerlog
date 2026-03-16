import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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

interface ReportPDFProps {
  report: any;
  details: ReportDetails;
  declaration?: any;
}

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
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
    color: "#666",
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
  calculationBox: {
    margin: 10,
    padding: 10,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 5,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  calculationStep: {
    fontSize: 12,
    marginBottom: 3,
    paddingLeft: 10,
  },
  declarationBox: {
    margin: 10,
    padding: 10,
    backgroundColor: "#E8F4FF",
    borderWidth: 1,
    borderColor: "#0066CC",
    borderRadius: 5,
  },
  measurementBox: {
    margin: 10,
    padding: 10,
    backgroundColor: "#F0FFF0",
    borderWidth: 1,
    borderColor: "#006600",
    borderRadius: 5,
  },
  resultBox: {
    margin: 10,
    padding: 10,
    backgroundColor: "#FFF8E8",
    borderWidth: 1,
    borderColor: "#CC9900",
    borderRadius: 5,
  },
});

const ReportPDF = ({ report, details, declaration }: ReportPDFProps) => {
  const isFromPowerlog = report.source === "POWERLOG";
  const effectivePower = isFromPowerlog 
    ? (details.measuredPower || details.declaredPower)
    : details.declaredPower;
  const actualRatio = details.measuredWeight / effectivePower;
  const weightOutside = ((details.measuredWeight / actualRatio) - (details.measuredWeight / details.requiredRatio)) * details.requiredRatio;
  const percentOutside = 100 - ((actualRatio / details.requiredRatio) * 100);
  const isUnderLimit = actualRatio < details.requiredRatio;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text>Vekt/Effekt Ratio Rapport</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>1. Bilens Selvangivelse</Text>
          <View style={styles.declarationBox}>
            <Text style={styles.subtitle}>Registrerte verdier på bilen:</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Bil:</Text>
                <Text style={styles.tableCell}>{details.carInfo}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Startnummer:</Text>
                <Text style={styles.tableCell}>{details.startNumber}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Deklarert effekt:</Text>
                <Text style={styles.tableCell}>{details.declaredPower} hk</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Krav ratio:</Text>
                <Text style={styles.tableCell}>{details.requiredRatio.toFixed(2)} kg/hk</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>2. Måleresultater</Text>
          <View style={styles.measurementBox}>
            <Text style={styles.subtitle}>Målinger utført:</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Kilde:</Text>
                <Text style={styles.tableCell}>{report.source === "POWERLOG" ? "Fra Powerlog" : "Fra vektreg"}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Målt vekt:</Text>
                <Text style={styles.tableCell}>{details.measuredWeight} kg</Text>
              </View>
              {isFromPowerlog && details.measuredPower && (
                <>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Målt effekt:</Text>
                    <Text style={styles.tableCell}>{details.measuredPower} hk</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableCell}>Effekt avvik:</Text>
                    <Text style={styles.tableCell}>
                      {((details.measuredPower - details.declaredPower) / details.declaredPower * 100).toFixed(2)}%
                      ({details.measuredPower > details.declaredPower ? "+" : ""}{(details.measuredPower - details.declaredPower).toFixed(2)} hk)
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>3. Utregning av Avvik</Text>
          <View style={styles.resultBox}>
            <Text style={styles.calculationTitle}>Beregning av faktisk ratio:</Text>
            <Text style={styles.calculationStep}>• Målt vekt: {details.measuredWeight} kg</Text>
            <Text style={styles.calculationStep}>• Effektiv effekt: {effectivePower} hk</Text>
            <Text style={styles.calculationStep}>• Faktisk ratio = {details.measuredWeight} kg / {effectivePower} hk = {actualRatio.toFixed(2)} kg/hk</Text>
          </View>

          <View style={styles.resultBox}>
            <Text style={styles.calculationTitle}>Beregning av vekt utenfor:</Text>
            <Text style={styles.calculationStep}>• Faktisk ratio: {actualRatio.toFixed(2)} kg/hk</Text>
            <Text style={styles.calculationStep}>• Krav ratio: {details.requiredRatio.toFixed(2)} kg/hk</Text>
            <Text style={styles.calculationStep}>• Vekt utenfor = (({details.measuredWeight} kg / {actualRatio.toFixed(2)}) - ({details.measuredWeight} kg / {details.requiredRatio.toFixed(2)})) * {details.requiredRatio.toFixed(2)} = {weightOutside.toFixed(2)} kg</Text>
          </View>

          <View style={styles.resultBox}>
            <Text style={styles.calculationTitle}>Beregning av prosent utenfor:</Text>
            <Text style={styles.calculationStep}>• Prosent utenfor = 100 - (({actualRatio.toFixed(2)} / {details.requiredRatio.toFixed(2)}) * 100) = {percentOutside.toFixed(2)}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>4. Konklusjon</Text>
          <View style={[styles.resultBox, { backgroundColor: isUnderLimit ? "#FFE4E4" : "#E4FFE4" }]}>
            <Text style={styles.calculationTitle}>
              {isUnderLimit ? "Bilen er under krav" : "Bilen oppfyller krav"}
            </Text>
            <Text style={styles.text}>
              • Faktisk ratio: {actualRatio.toFixed(2)} kg/hk
            </Text>
            <Text style={styles.text}>
              • Krav ratio: {details.requiredRatio.toFixed(2)} kg/hk
            </Text>
            <Text style={styles.text}>
              • Vekt utenfor: {weightOutside.toFixed(2)} kg
            </Text>
            <Text style={styles.text}>
              • Prosent utenfor: {percentOutside.toFixed(2)}%
            </Text>
          </View>
        </View>

        {report.source === "POWERLOG" && details.measuredPower && details.measuredPower > details.declaredPower && (
          <View style={[styles.errorBox, { marginTop: 20 }]}>
            <Text style={styles.errorTitle}>Advarsel - Effektavvik</Text>
            <Text style={styles.text}>
              Målt effekt ({details.measuredPower.toFixed(2)} hk) er {((details.measuredPower - details.declaredPower) / details.declaredPower * 100).toFixed(2)}% høyere enn deklarert ({details.declaredPower.toFixed(2)} hk)
            </Text>
          </View>
        )}

        {report.resolution && (
          <View style={styles.section}>
            <Text style={styles.title}>5. Løsning</Text>
            <Text style={styles.text}>{report.resolution}</Text>
          </View>
        )}

        {report.sentToJury && report.juryComment && (
          <View style={[styles.errorBox, { marginTop: 20 }]}>
            <Text style={styles.errorTitle}>Jury Melding</Text>
            <Text style={styles.text}>{report.juryComment}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ReportPDF; 