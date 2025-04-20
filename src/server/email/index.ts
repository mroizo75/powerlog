import { Resend } from 'resend';

// Initialiser Resend med API-nøkkelen
const resend = new Resend(process.env.RESEND_API_KEY);

interface DeclarationReceiptParams {
  to: string;
  startNumber: string;
  carInfo: string;
  declaredClass: string;
  declaredWeight: number;
  declaredPower: number;
}

export class EmailService {
  /**
   * Sender en e-postkvittering til brukeren etter innsending av selvangivelse
   */
  async sendDeclarationReceipt({
    to,
    startNumber,
    carInfo,
    declaredClass,
    declaredWeight,
    declaredPower,
  }: DeclarationReceiptParams) {
    try {
      console.log(`Attempting to send email to ${to} for declaration ${startNumber}`);
      
      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Email will not be sent.");
        return false;
      }
      
      const ratio = declaredWeight / declaredPower;
      
      const result = await resend.emails.send({
        from: 'noreply@powerlogg.no',
        to,
        subject: `Kvittering på selvangivelse #${startNumber}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1d4ed8;">Kvittering på selvangivelse</h1>
            <p>Takk for din selvangivelse. Her er en oppsummering av informasjonen du har oppgitt:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Detaljer</h2>
              <p><strong>Startnummer:</strong> ${startNumber}</p>
              <p><strong>Bil:</strong> ${carInfo}</p>
              <p><strong>Klasse:</strong> ${declaredClass}</p>
              <p><strong>Deklarert vekt:</strong> ${declaredWeight} kg</p>
              <p><strong>Deklarert effekt:</strong> ${declaredPower} hk</p>
              <p><strong>Vekt/effekt-forhold:</strong> ${ratio.toFixed(2)} kg/hk</p>
            </div>
            
            <p>Selvangivelsen er nå registrert i systemet og vil bli brukt ved vektkontroll og powerlog.</p>
            
            <p style="color: #6b7280; font-size: 0.8em; margin-top: 40px;">
              Dette er en automatisk generert e-post. Vennligst ikke svar på denne meldingen.
            </p>
          </div>
        `,
      });
      
      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('Feil ved sending av e-post:', error);
      return false;
    }
  }
}

// Singleton-instans av e-posttjenesten
export const emailService = new EmailService(); 