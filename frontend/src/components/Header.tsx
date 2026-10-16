"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "2-in-1 Experience" },
  { href: "/search", label: "Mode A: Visual Search" },
  { href: "/compatibility", label: "Mode B: Compatibility" },
  { href: "/products", label: "Catalog (320+)" },
];


export function Header() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight">Smart Visual Shopping</Link>
        <nav aria-label="Main" className="flex flex-wrap gap-1">
          {links.map((l) => {
            const active = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-brand-tint text-brand-dark underline underline-offset-4" : "hover:bg-paper"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
