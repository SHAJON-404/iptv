"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Trophy, Code } from "lucide-react";

export default function MobileNavBar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "World Cup",
      href: "/fixtures",
      icon: Trophy,
      isActive: pathname === "/fixtures",
    },
    {
      label: "Developer",
      href: "/about",
      icon: Code,
      isActive: pathname === "/about",
    },
    {
      label: "Profile",
      href: "/dashboard",
      icon: User,
      isActive: pathname === "/dashboard",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0d0925]/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl shadow-2xl px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] flex items-center justify-around select-none">
      {navItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.label}>
            {idx > 0 && <div className="h-8 w-[1px] bg-white/10" />}
            <Link
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl transition-all duration-300 ${
                item.isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-zinc-400 hover:text-white border border-transparent"
              }`}
            >
              <Icon size={20} className={item.isActive ? "animate-pulse" : ""} />
              <span className="text-[10px] font-bold tracking-wide uppercase whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          </React.Fragment>
        );
      })}
    </div>
  );
}
