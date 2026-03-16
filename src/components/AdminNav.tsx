"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getNavLinks = () => {
    const role = session?.user?.role;
    
    const links = [
      { href: "/admin", label: "Dashboard", roles: ["ADMIN"] },
      { href: "/admin/cars", label: "Biler", roles: ["ADMIN", "TEKNISK"] },
      { href: "/admin/check-in", label: "Innsjekk", roles: ["ADMIN", "INNSJEKK", "TEKNISK"] },
      { href: "/admin/weightreg", label: "Vektregistrering", roles: ["ADMIN", "VEKTREG", "TEKNISK"] },
      { href: "/admin/weight-list", label: "Vektliste", roles: ["ADMIN", "VEKTREG", "TEKNISK"] },
      { href: "/admin/users", label: "Brukere", roles: ["ADMIN"] },
      { href: "/admin/reports", label: "Rapporter", roles: ["ADMIN", "TEKNISK"] },
      { href: "/admin/powerlog", label: "Powerlog", roles: ["ADMIN", "POWERLOG"] },
      { href: "/admin/boxlog", label: "Box Log", roles: ["ADMIN", "VEKTREG", "TEKNISK"] },
    ];

    return links.filter(link => link.roles.includes(role || ""));
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <div className="flex flex-shrink-0 items-center">
              <h1 className="text-xl font-bold text-gray-900">
                {session?.user?.role === "ADMIN" ? "Admin Dashboard" : 
                 session?.user?.role === "INNSJEKK" ? "Innsjekk" :
                 session?.user?.role === "VEKTREG" ? "Vektregistrering" :
                 session?.user?.role === "POWERLOG" ? "Powerlog" :
                 session?.user?.role === "TEKNISK" ? "Teknisk" : "Dashboard"}
              </h1>
            </div>
            {/* Desktop navigation */}
            <div className="ml-6 hidden md:flex space-x-8">
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
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Åpne hovedmeny</span>
              {/* Hamburger icon */}
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* X icon */}
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className="hidden md:flex items-center">
            <button
              onClick={() => signOut()}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Logg ut
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="space-y-1 pt-2 pb-3">
          {getNavLinks().map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
                isActive(link.href)
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-gray-200 pt-4 pb-3">
            <div className="px-4">
              <button
                onClick={() => signOut()}
                className="mt-1 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 