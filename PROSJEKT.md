Nedenfor finner du en strukturert plan for Powerlog-prosjektet basert på de oppgitte kravene. Planen dekker både funksjonelle og ikke-funksjonelle krav, systemarkitektur, brukerroller, dataflyt, rapportering og sikkerhet. Jeg har også inkludert punkter der det kan være behov for ytterligere avklaringer.

---

## 1. Prosjektoversikt

- **Formål:**  
  Utvikle et Next.js-basert system for Powerlog som håndterer innsamling og prosessering av selvangivelsesdata fra førere, og videre distribusjon av data til ulike dashbord (admin, teknisk, vektreg, powerlog, innsjekk).

- **Hovedkomponenter:**  
  - Flere dashbord med tilpassede skjemaer og visninger for ulike roller.  
  - Integrasjon av beregninger (f.eks. vekt effekt) basert på data fra selvangivelsen og de faktiske vektmålingene.  
  - Automatisert rapportgenerering og epostvarsling ved avvik.

---

## 2. Systemarkitektur

- **Frontend:**  
  - Next.js med React for å lage moderne, responsive brukergrensesnitt.  
  - Separate ruter/moduler for hvert dashboard (admin, teknisk, vektreg, powerlog, innsjekk).

- **Backend:**  
  - Next.js API-ruter for å håndtere dataflyt, forretningslogikk og beregninger.  
  - Eventuelt en dedikert mikroservice for komplekse beregninger om nødvendig.

- **Database:**  
  - Valg av database (f.eks. PostgreSQL eller MongoDB) for lagring av selvangivelsesdata, vektmålinger, rapporter og brukerdata.

- **Integrasjoner:**  
  - Eposttjeneste (f.eks. Nodemailer eller SendGrid) for å sende rapporter ved avvik.

---

## 3. Brukerroller og Dashbordfunksjoner

### 3.1. Vektreg Dashboard

- **Skjema:**  
  - Velge **klasse** (ut fra forhåndsdefinerte klasser, detaljene kommer senere).  
  - Angi **startnummer**.  
  - Registrere **vekt** (målt vekt).  
  - Valgfritt: **Powerlog ID**.  
  - Angi **nullpunkt**.  
  - Inkludere startnummerets **selvangivelsesvekt**.

- **Beregninger:**  
  - Kalkulere vekt effekt basert på:  
    - Data fra selvangivelsen (inndata fra fører).  
    - Målt vekt.  
    - Klasse-spesifikke vekt/effekt faktorer (vil bli spesifisert senere).

### 3.2. Teknisk Dashboard

- **Dataoversikt:**  
  - Tabell med følgende kolonner:  
    - Startnummer  
    - Vekt (fra selvangivelse)  
    - Effekt (fra selvangivelse)  
    - Målt vekt  
    - Vekt/effekt faktor  
    - Resultat av Powerlog-beregning  
    - (Evt. en ekstra kolonne for kontroll av målt vekt)

- **Rapportering:**  
  - Automatisk generering av rapporter ved verdier som er utenfor akseptable grenser.  
  - Epostutsendelse av disse rapportene til ansvarlig teknisk personell.

### 3.3. Powerlog Dashboard

- **Informasjon:**  
  - Visning av informasjon om den målte bilen:  
    - ID-nummer  
    - Målt vekt  
    - Nullpunkt  
    - Heat-nummer

- **Handlinger:**  
  - Inndata for vekt effekt-resultatet.  
  - Ved avvik: Generere rapport som sendes til teknisk personell.

### 3.4. Admin Dashboard

- **Oversikt:**  
  - Vise all informasjon knyttet til startnummer og tilknyttede data fra de ulike dashboardene.
  - Administrasjon av brukere, roller og tilgang til systemet.

### 3.5. Innsjekk Dashboard

- **Funksjonalitet:**  
  - Oversikt over alle førere som har fylt inn selvangivelsen.
  - Rask status på innsendte skjemaer uten detaljert data fra de andre rollene.

---

## 4. Funksjonelle Krav og Dataflyt

- **Skjema-innsending:**  
  - Førere fyller ut selvangivelsen via et dedikert skjema.  
  - Data fra selvangivelsen lagres og kobles til et unikt startnummer.

- **Vektregistrering og Beregning:**  
  - Vektreg fyller inn ytterligere data (klasse, målt vekt, nullpunkt, evt. Powerlog ID).  
  - Systemet henter selvangivelsesdata basert på startnummer og kalkulerer vekt effekt.  
  - Beregningene må ta hensyn til:  
    - Det som er angitt av fører  
    - Målt vekt  
    - Forhåndsdefinerte faktorer for den valgte klassen

- **Data Presentasjon:**  
  - Teknisk dashboard viser en samlet oversikt med all relevant data og beregnet vekt effekt.  
  - Powerlog dashboard fokuserer på bilens detaljer og inndata fra deres system.

- **Rapportering:**  
  - Når verdier er utenfor fastsatte grenser, trigges rapportgenerering.  
  - Rapporter sendes automatisk til teknisk ansvarlig via epost.

---

## 5. Autentisering og Autorisasjon

- **Rollebasert Tilgangskontroll (RBAC):**  
  - Implementere sikkerhetsmekanismer slik at hver bruker kun får tilgang til det dashboardet og de funksjonene som er relevante for deres rolle.  
  - Mulighet for administrasjon av brukere, f.eks. med NextAuth.js eller et tilsvarende system.

---

## 6. Backend API og Dataintegrasjon

- **API Endepunkter:**  
  - Skjema-innsending og lagring av selvangivelsesdata.  
  - Endepunkter for å hente og lagre vektregistreringsdata.  
  - Endepunkter for beregning av vekt effekt og lagring av resultat.  
  - Endepunkt for rapportgenerering og utløsing av epostvarsling.

- **Database:**  
  - Design av datamodeller for:  
    - Brukere og roller  
    - Selvangivelsesdata (knyttet til startnummer)  
    - Vektregistreringsdata  
    - Beregnede resultater og rapporter

---

## 7. Brukergrensesnitt (UI/UX)

- **Design og Layout:**  
  - Moderne, responsivt design med klar navigasjon mellom de ulike dashboardene.  
  - Hver modul (f.eks. skjemaer, datatabeller) skal ha intuitiv validering og feilmeldinger.

- **Skjemavalidering:**  
  - Klient- og server-side validering for å sikre korrekt inndata.  
  - Brukervennlig feedback ved feil eller avvik.

- **Interaktive Tabeller:**  
  - Sorterings- og filtreringsfunksjonalitet i teknisk dashboard for å enkelt finne ut av avvikende data.

---

## 8. Epostintegrasjon og Rapportering

- **Rapport Generering:**  
  - Logikk for å oppdage når verdier er utenfor akseptable grenser.  
  - Dynamisk generering av rapporter basert på data fra teknisk og powerlog dashboard.

- **Epostutsendelse:**  
  - Integrasjon med en eposttjeneste (f.eks. SendGrid eller Nodemailer).  
  - Automatisk utsendelse av rapporter til definert teknisk kontakt ved avvik.

---

## 9. Testing, Deployment og Sikkerhet

- **Testing:**  
  - Unit testing av forretningslogikk (f.eks. beregning av vekt effekt).  
  - Integrasjonstesting for API-endepunkter og dataintegrasjon.  
  - End-to-end testing for brukerflyt og dashboardfunksjonalitet.

- **Deployment:**  
  - Bruk av en plattform som Vercel for Next.js-deployment.  
  - CI/CD pipeline for automatisert testing og deployment.

- **Sikkerhet:**  
  - Implementere sikre API-endepunkter og lagring av sensitive data.  
  - GDPR-overholdelse og bruk av kryptering der det er nødvendig.  
  - Regelmessige sikkerhetsrevisjoner og oppdateringer.

---

## 10. Dokumentasjon og Vedlikehold

- **Utviklerdokumentasjon:**  
  - Detaljert API-dokumentasjon, datamodellbeskrivelser og arkitekturdiagrammer.  
  - Kommentarer i koden og en vedlikeholdsplan.

- **Brukerdokumentasjon:**  
  - Brukerveiledninger for hvert dashboard.  
  - Instruksjoner for feilsøking og rapportering av feil.

---

## 11. Avklaringspunkter og Spørsmål

- **Klasser og Vekt-effekt Faktorer:**  
  - Hvilke klasser skal implementeres, og hva er de spesifikke vekt-effekt faktorene for hver klasse?  
  - Skal disse faktorene være dynamisk konfigurerbare via et administrasjonspanel?

- **Rapporteringsgrenser:**  
  - Hva definerer en "utenfor" grense for både teknisk og powerlog rapportering?  
  - Er det forskjellige terskler for ulike klasser eller måleparametre?

- **Epostkonfigurasjon:**  
  - Hvilken eposttjeneste og konfigurasjon skal benyttes for utsendelse av rapporter?  
  - Er det spesifikke maler som skal brukes for rapportene?

- **Brukeradministrasjon:**  
  - Skal systemet integreres med et eksisterende brukerhåndteringssystem, eller skal alt bygges fra bunnen av?  
  - Er det spesielle krav til autentisering (f.eks. SSO, multifaktorautentisering)?

---

Denne planen gir et helhetlig overblikk over de nødvendige komponentene og funksjonaliteten for Powerlog-prosjektet. Hvis det er noe du lurer på eller ønsker ytterligere avklaringer på, så gi beskjed!

# Klasser og vekt effekt faktor
GT5 (7,3)
Maks tillatt effekt er 160 hk(drivhjulseffekt) og vekt/effekt forholdet er7,3, det vil si at effekten x 7,3 er vekten på bil med fører. Minimum vekt for bil med fører er 800kg. Motorer med oppgitt orginal effekt over 180 hk (motoreffekt) eller 160 hk (drivhjulseffekt) kan ikke delta i klassen.
GT4 (4,9), GT4 Turbo (5,5)
Vekt/effekt for GT4 klassen er satt til 4,9 for normalt aspirerende motorer og 5,5 for biler med overlading, maks 250hk, dette er drivhjulshester og vil kontrollerers med powerlog. Minimum vekt i klassen uansett effekt er 1000kg. Alle vekter skal rundes opp til nærmeste 10kg og er inkludert fører målt etter konkurranse. Bilene skal også ha tilleggsvekt iht bilens utstyr etter listen under
GT3 (3,7), GT3 Turbo (4,0)
Vekt/effekt for GT3 klassen er satt til 3,7 for normalt aspirerende motorer og 4,0 for biler med overlading, maks 420hk, dette er drivhjulshester og vil kontrollerers med powerlog. Minimum vekt i klassen uansett effekt er 1000kg. Alle vekter skal rundes opp til nærmeste 10kg og er inkludert fører målt etter konkurranse. Bilene skal også ha tilleggsvekt iht bilens utstyr etter listen under
GT1 (2,5)
Vekt/effekt for GT1 klassen er satt til 2,5, dette er drivhjulshester og vil kontrollerers med powerlog. Minimum vekt i klassen uansett effekt er 900kg. Alle vekter skal rundes opp til nærmeste 10kg og er inkludert fører målt etter konkurranse. Bilene skal også ha tilleggsvekt iht bilens utstyr etter listen under. Spesifikk innklassede biler: FIA GT3 biler nyere enn 2015. FIA GT3 biler fra 2015-2016 og 2017 skal gå med restriktorer. FIA GT3 biler fra og med 2018 klasses inn i GT+ klassen. Liste for tillegsvekt iht bilens utstyr GT1 under.
GT+ (1,0)
Her godkjennes biler som ellers ikke klasserer inn i GT1. Klassen har en minimumsvekt på 900kg med sjåfør, bilene har ingen begrensning på motorvolum eller effekt, men må forholde seg til en minimumsvekt beregnet etter 1,0 vekt/effekt. Bilene skal forholde seg til sikkerhetsbestemmelser i dette reglementet.

# Tillegsvekt for klassene
GT4 begge klassene:
Racing ABS (30kg)
Racing traction controll (25kg)
DSG eller sekvensiell gearkasse (35kg)
Kryss av det som gjelder din bil.

GT3 begge klassene
Racing ABS (30kg)|30
Racing traction controll (40kg)|40
Ikke orginal DSG (35kg)|35
Proff bygget -2005 (40 kg)|40
Proff bygget Årsmodell 2005-2008 (60kg)|60
Proff bygget Årsmodell 2009-2012 (70kg)|70
Proff bygget Årsmodell 2013 -    (80kg)|80

GT1
Tillegsvekt proffbygd bil (50kg)
Racing ABS (30kg)
Racing traction controll (25kg)
Aktive differensialer (50kg)
Justerbar aero (50kg)
Keramiske bremser (50kg)

# VIKTIG
Eksempel. Startnummer 504 leverer selvangivelsen sin, så blir han sjekket på vekt/effekt ved vektregistrering. Finner ut at han er utenfor sin vekt/effekt forhold. Må da legge inn mer vekt, så sende inn ny selvangivelse. Vi skal ha data på forrige selvangivelse og vekt/effekt forhols som var feil. Dette er pga historisk så får man 3 advarsler før man kan bli disket og andre regler. Så dette må vi ha oversikt over.
1. selvangivelse for 504 med turbo er: 1195 kg + tillegsvekt 35 kg /	205 hk =	6.00 kg/hk. 
2. selvangivelse for 504 med turbo er: 1185 kg + tillegsvekt 35 kg /	210 hk =	5.80 kg/hk. 
Vi må da ha data på innlevert selvangivelse på bilen, som alltid skal vise den siste. og kun vise 5 stk, resten med pagnering. Dette gjelder alle tabellene.