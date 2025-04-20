import Link from "next/link";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  const session = await auth();

  const isLoggedIn = session?.user?.name !== undefined;

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Power<span className="text-blue-500">log</span>
          </h1>
          
          <div className="flex justify-center">
            <Link
              className="flex max-w-md flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="/declaration"
            >
              <h3 className="text-2xl font-bold">Selvangivelse →</h3>
              <div className="text-lg">
                Send inn selvangivelse for din bil med vekt og effektdata.
              </div>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-2xl text-white">
              {isLoggedIn ? (
                <span>Logget inn som {session.user.name}</span>
              ) : (
                <span>Logg inn for å komme i gang</span>
              )}
            </p>
            <Link
              href={isLoggedIn ? "/api/auth/signout" : "/login"}
              className="rounded-full bg-blue-600 px-10 py-3 font-semibold text-white no-underline transition hover:bg-blue-500"
            >
              {isLoggedIn ? "Logg ut" : "Logg inn"}
            </Link>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
