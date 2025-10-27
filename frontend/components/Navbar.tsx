import React from "react";
import WalletConnect from "@/components/wallet/WalletConnect";
import { ModeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="w-full bg-background flex items-center justify-between px-4 py-2">
      <Link href="/">
        <span className="font-semibold text-2xl text-foreground">Sol Poll</span>
      </Link>
      <div className="flex gap-8 text-base">
        <Link href="/polls">Polls</Link>
        <Link href="/create">Create</Link>
      </div>
      <div className="flex gap-4 text-base">
        <ModeToggle />
        <WalletConnect />
      </div>
    </nav>
  );
};

export default Navbar;
