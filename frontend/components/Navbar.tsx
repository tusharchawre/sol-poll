"use client";
import React, { useEffect, useState } from "react";
import WalletConnect from "@/components/wallet/WalletConnect";
import { ModeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { Button } from "./ui/button";
import PollForm from "./poll-form";
import * as anchor from "@coral-xyz/anchor";
import { useProgram } from "@/hooks/useProgram";

const Navbar = () => {
  const { program, publicKey } = useProgram();
  const [repScore, setRepScore] = useState<number | null>(null);
  const [repTier, setRepTier] = useState<string | null>(null);
  const [repBump, setRepBump] = useState(false);

  useEffect(() => {
    if (!program || !publicKey) {
      setRepScore(null);
      setRepTier(null);
      return;
    }

    let cancelled = false;
    const fetchReputation = async () => {
      try {
        const [reputationPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("reputation"), publicKey.toBuffer()],
          program.programId
        );
        const account = await program.account.userReputation.fetchNullable(
          reputationPda
        );
        if (cancelled) return;
        if (account) {
          const score = Number(account.reputationScore);
          const tierKey = Object.keys(account.tier || {})[0] || "newbie";
          const prettyTier =
            tierKey === "legend"
              ? "Legend"
              : tierKey === "veteran"
              ? "Veteran"
              : tierKey === "regular"
              ? "Regular"
              : "Newbie";
          setRepScore(score);
          setRepTier(prettyTier);
        } else {
          setRepScore(0);
          setRepTier("Newbie");
        }
      } catch (e) {
        setRepScore(null);
        setRepTier(null);
      }
    };

    fetchReputation();

    const onRefresh = () => {
      fetchReputation().then(() => {
        setRepBump(true);
        setTimeout(() => setRepBump(false), 900);
      });
    };
    window.addEventListener("reputation:refresh", onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("reputation:refresh", onRefresh);
    };
  }, [publicKey]);
  return (
    <nav className="w-full bg-background flex items-center justify-between px-4 py-3 md:py-4">
      <Link href="/">
        <span className="font-semibold tracking-tight text-xl md:text-2xl text-foreground">
          Sol Poll
        </span>
      </Link>
      <div className="flex gap-6 text-base" />
      <div className="flex gap-3 md:gap-4 text-base items-center">
        <div className="flex items-center gap-2">
          {repScore !== null && repTier && (
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold " +
                "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 transition-transform " +
                (repBump ? "scale-110" : "scale-100")
              }
            >
              ✨ {repScore} · {repTier}
            </span>
          )}
        </div>
        <PollForm />
        <ModeToggle />
        <WalletConnect />
      </div>
    </nav>
  );
};

export default Navbar;
