"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getNavLinks = () => {
    const role = session?.user?.role;
    
    const links = [
      { href: "/admin", label: "Dashboard", roles: ["ADMIN"] },
      { href: "/admin/cars", label: "Biler", roles: ["ADMIN"] },
      { href: "/admin/check-in", label: "Innsjekk", roles: ["ADMIN", "INNSJEKK"] },
      { href: "/admin/weightreg", label: "Vektregistrering", roles: ["ADMIN", "VEKTREG"] },
      { href: "/admin/weight-list", label: "Vektliste", roles: ["ADMIN", "VEKTREG"] },
      { href: "/admin/users", label: "Brukere", roles: ["ADMIN"] },
      { href: "/admin/reports", label: "Rapporter", roles: ["ADMIN"] },
      { href: "/admin/powerlog", label: "Powerlog", roles: ["ADMIN", "POWERLOG"] },
      { href: "/admin/boxlog", label: "Box Log", roles: ["ADMIN"] },
    ];

    return links.filter(link => link.roles.includes(role || ""));
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <h1 className="text-xl font-bold text-gray-900">
                {session?.user?.role === "ADMIN" ? "Admin Dashboard" : 
                 session?.user?.role === "INNSJEKK" ? "Innsjekk" :
                 session?.user?.role === "VEKTREG" ? "Vektregistrering" :
                 session?.user?.role === "POWERLOG" ? "Powerlog" :
                 session?.user?.role === "TEKNISK" ? "Teknisk" : "Dashboard"}
              </h1>
            </div>
            <div className="ml-6 flex space-x-8">
              {getNavLinks().map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                    isActive(link.href)
                      ? "border-blue-500 text-gray-900"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => signOut()}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Logg ut
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 