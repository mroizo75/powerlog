# Powerlogg Prosjektstatus

## 1. Grunnleggende Oppsett ✅
- [x] T3 Stack initiering
- [x] Prisma database setup
- [x] NextAuth.js implementasjon
- [x] Grunnleggende rollebasert tilgangskontroll

## 2. Datamodellering og Database ✅
- [x] Prisma skjema definert
- [x] Database migrering
- [x] Prisma Client generert
- [ ] Testdata for utvikling
- [ ] Database backup strategi

## 3. Autentisering og Autorisasjon
- [x] Grunnleggende NextAuth.js setup
- [x] Discord autentisering
- [x] Rollebasert tilgangskontroll (RBAC)
- [ ] Beskyttede ruter per rolle
- [ ] Middleware for tilgangskontroll

## 4. API og Backend
### 4.1 tRPC Rutere
- [ ] Bilregistrering
  - [x] Opprett bil
  - [x] Hent bilinformasjon
  - [x] Oppdater bilinformasjon
- [ ] Selvangivelse
  - [x] Send inn selvangivelse
  - [x] Hent selvangivelse
  - [x] Oppdater selvangivelse
- [ ] Vektmåling
  - [x] Registrer vektmåling
  - [x] Hent vektmålinger
  - [ ] Beregn vekt/effekt
- [ ] Rapportering
  - [ ] Generer rapport
  - [ ] Hent rapporter
  - [ ] Oppdater rapportstatus

### 4.2 Forretningslogikk
- [ ] Vekt/effekt beregninger
  - [ ] GT5 (7,3)
  - [ ] GT4 (4,9)
  - [ ] GT4 Turbo (5,5)
  - [ ] GT3 (3,7)
  - [ ] GT3 Turbo (4,0)
  - [ ] GT1 (2,5)
  - [ ] GT+ (1,0)
- [ ] Validering av målinger
- [ ] Automatisk rapportgenerering

## 5. Frontend og UI
### 5.1 Grunnleggende Layout
- [x] Navigasjonsmeny
- [x] Responsivt design
- [x] Fellesskomponenter
- [x] Feilhåndtering og varslinger
- [x] Forside med relevant innhold
- [x] Innloggingsside med Discord-integrasjon

### 5.2 Dashbord
#### 5.2.1 Vektreg Dashboard
- [x] Skjema for vektmåling
- [x] Visning av selvangivelse
- [ ] Beregningsvisning
- [ ] Rapporteringsfunksjonalitet

#### 5.2.2 Teknisk Dashboard
- [ ] Datatabell med alle målinger
- [ ] Filtrering og sortering
- [ ] Detaljert visning
- [ ] Rapportgenerering

#### 5.2.3 Powerlog Dashboard
- [ ] Bilinformasjonsvisning
- [ ] Målingsregistrering
- [ ] Resultatvisning
- [ ] Avviksrapportering

#### 5.2.4 Admin Dashboard
- [x] Brukeradministrasjon
- [x] Systeminnstillinger
- [x] Oversikt og statistikk
- [x] Loggvisning

#### 5.2.5 Innsjekk Dashboard
- [ ] Selvangivelsesoversikt
- [ ] Statusvisning
- [ ] Rask registrering

### 5.3 Skjemaer
- [x] Selvangivelsesskjema
- [ ] Vektmålingsskjema
- [ ] Rapporteringsskjema
- [ ] Validering og feilhåndtering

## 6. Beregninger og Validering
- [ ] Implementere vekt/effekt beregninger
- [ ] Tilleggsvekt for utstyr
- [ ] Avviksberegning
- [ ] Automatisk avrunding
- [ ] Validering av klasser

## 7. Rapportering og Varsling
- [ ] PDF-generering
- [ ] Epostintegrasjon
- [ ] Automatisk varsling
- [ ] Varslingshistorikk
- [ ] Rapportmaler

## 8. Testing
### 8.1 Enhetstester
- [ ] Beregningstester
- [ ] Valideringstester
- [ ] API-tester

### 8.2 Integrasjonstester
- [ ] API-integrasjon
- [ ] Database-integrasjon
- [ ] Autentiseringstester

### 8.3 End-to-end tester
- [ ] Brukerflyt
- [ ] Dashboard-funksjonalitet
- [ ] Skjemahåndtering

## 9. Deployment og Drift
- [ ] CI/CD pipeline
- [ ] Produksjonsmiljø setup
- [ ] Overvåking og logging
- [ ] Backup og gjenoppretting
- [ ] Sikkerhetsrevisjon

## 10. Dokumentasjon
- [ ] API-dokumentasjon
- [ ] Brukerveiledninger
- [ ] Utviklerdokumentasjon
- [ ] Vedlikeholdsplan

## Neste steg
1. Implementere beskyttede ruter per rolle
2. Sette opp middleware for tilgangskontroll
3. Implementere vekt/effekt beregninger
4. Sette opp teknisk dashboard

## Notater
- Moderne design med animasjoner implementert
- Admin-funksjonalitet klar for testing
- Fokus på brukervennlighet og responsivt design
- Sikre robust feilhåndtering
- Implementere logging for debugging 