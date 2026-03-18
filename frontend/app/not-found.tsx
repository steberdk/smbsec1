import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <main className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-teal-700 font-bold text-sm mb-2">smbsec</p>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors text-sm"
        >
          Go to home page
        </Link>
        <Link
          href="/checklist"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors text-sm"
        >
          Browse the checklist
        </Link>
      </div>
    </main>
  );
}
