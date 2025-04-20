"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function DeclarationSuccessPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="mb-4 text-3xl font-bold text-green-600">
          Selvangivelse sendt inn!
        </h1>
        <p className="mb-4 text-lg text-gray-600">
          Takk for din selvangivelse. Den er nå registrert i systemet.
        </p>
        
        {email && (
          <div className="mb-8 rounded-lg bg-blue-50 p-4 text-blue-700">
            <p>En kvittering er sendt til din e-postadresse: <strong>{email}</strong></p>
            <p className="mt-2 text-sm">
              (Hvis du ikke ser e-posten i innboksen din, sjekk spam-mappen)
            </p>
          </div>
        )}
        
        <div className="space-x-4">
          <Link
            href="/declaration"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Send inn ny selvangivelse
          </Link>
          <Link
            href="/"
            className="inline-block rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Tilbake til hjemmesiden
          </Link>
        </div>
      </div>
    </div>
  );
} 