import Link from "next/link";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  const session = await auth();

  const isLoggedIn = session?.user?.name !== undefined;

  return (
    <HydrateClient>
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl sm:p-10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Powerlog</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Enkel innsending
              <span className="block text-blue-400">for førere</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
              Send inn selvangivelse raskt fra mobil. Hele flyten er laget for at du skal være ferdig på under ett minutt.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                className="rounded-xl bg-blue-600 px-5 py-4 text-center text-sm font-semibold transition hover:bg-blue-500"
                href="/declaration"
              >
                Gå til selvangivelse
              </Link>
              <Link
                href={isLoggedIn ? "/api/auth/signout" : "/login"}
                className="rounded-xl border border-slate-700 px-5 py-4 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                {isLoggedIn ? "Logg ut" : "Logg inn"}
              </Link>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
              {isLoggedIn ? `Logget inn som ${session.user.name}` : "Logg inn for å få tilgang til admin og roller."}
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
