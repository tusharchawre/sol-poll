import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import { Users, Trophy, Clock, Target, Shield, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import * as anchor from "@coral-xyz/anchor";
import { useProgram } from "@/hooks/useProgram";

type Campaign = {
  publicKey: string;
  account: {
    creator: string;
    title: string;
    description: string;
    options: string[];
    reward: string;
    participants: string[];
    maxParticipants: string;
    rewardPerParticipant: string;
    voteCount: string[];
    totalVotes: string;
    minReputation: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    bump: number;
  };
};

type PollCardProps = Campaign & {
  className?: string;
};

function formatTime(timestampHex: string) {
  const timestamp = parseInt(timestampHex, 16) * 1000;
  const date = new Date(timestamp);
  const isValid = !isNaN(date.getTime());
  const iso = isValid ? date.toISOString() : "";
  const label = isValid
    ? date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Invalid date";
  return { iso, label };
}

export default function PollCard({
  publicKey,
  account,
  className,
}: PollCardProps) {
  const { iso: endIso, label: endLabel } = formatTime(account.endDate);

  const totalReward = (parseInt(account.reward, 16) / 1e9).toFixed(2);
  const maxParticipants = parseInt(account.maxParticipants, 16);
  const rewardPerParticipant = (
    parseInt(account.rewardPerParticipant, 16) / 1e9
  ).toFixed(2);
  const voteCount = account.voteCount.map((v) => parseInt(v, 16));
  const totalVotes = parseInt(account.totalVotes, 16);
  const minReputation = parseInt(account.minReputation, 16);

  const reputationLevels = ["Newbie", "Regular", "Veteran", "Legend"];
  const reputationLabel = reputationLevels[minReputation] || "Unknown";

  const participantProgress =
    maxParticipants > 0
      ? (account.participants.length / maxParticipants) * 100
      : 0;

  // Countdown timer (updates every second)
  const [remaining, setRemaining] = useState<string>("");

  const endMs = useMemo(() => {
    const t = parseInt(account.endDate, 16) * 1000;
    return isNaN(t) ? 0 : t;
  }, [account.endDate]);

  useEffect(() => {
    function formatRemaining(ms: number) {
      if (ms <= 0) return "Ended";
      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (days > 0) return `${days}:${hours}:${minutes}:${seconds}`;
      if (hours > 0) return `${hours}:${minutes}:${seconds}`;
      return `${minutes}:${seconds}`;
    }

    const tick = () => {
      const now = Date.now();
      setRemaining(formatRemaining(endMs - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs]);
  const isEnded = endMs <= Date.now();
  const { program, publicKey: userPublicKey } = useProgram();
  const [userTierIndex, setUserTierIndex] = useState<number | null>(null);

  // Fetch user's reputation tier and listen for updates
  useEffect(() => {
    let cancelled = false;
    const fetchReputation = async () => {
      try {
        if (!program || !userPublicKey) {
          setUserTierIndex(null);
          return;
        }
        const [reputationPda] = anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from("reputation"), userPublicKey.toBuffer()],
          program.programId
        );
        const rep = await program.account.userReputation.fetchNullable(
          reputationPda
        );
        if (cancelled) return;
        if (!rep) {
          setUserTierIndex(0);
          return;
        }
        const tierKey = Object.keys(rep.tier || {})[0] || "newbie";
        const idx =
          tierKey === "legend"
            ? 3
            : tierKey === "veteran"
            ? 2
            : tierKey === "regular"
            ? 1
            : 0;
        setUserTierIndex(idx);
      } catch (e) {
        setUserTierIndex(null);
      }
    };

    fetchReputation();
    const onRefresh = () => fetchReputation();
    if (typeof window !== "undefined") {
      window.addEventListener("reputation:refresh", onRefresh);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("reputation:refresh", onRefresh);
      }
    };
  }, [program, userPublicKey]);

  const isLocked =
    !isEnded && userTierIndex !== null && userTierIndex < minReputation;
  const barColorClass = isEnded
    ? "bg-neutral-500"
    : participantProgress <= 25
    ? "bg-emerald-500"
    : participantProgress <= 75
    ? "bg-yellow-500"
    : "bg-red-500";

  return (
    <Link
      href={isEnded || isLocked ? "#" : `/polls/${publicKey}`}
      onClick={(e) => {
        if (isEnded || isLocked) e.preventDefault();
      }}
      aria-disabled={isEnded || isLocked}
      className="block h-full"
    >
      <Card
        className={`${className} relative group ${
          isEnded
            ? "opacity-60 cursor-not-allowed"
            : isLocked
            ? "opacity-75 cursor-not-allowed"
            : "hover:shadow-lg cursor-pointer"
        } transition-shadow duration-300 border border-neutral-200/50 dark:border-neutral-700/50 shadow-md bg-linear-to-br from-white/40 via-white/60 to-neutral-50/40 dark:from-neutral-900/10 dark:via-neutral-800/40 dark:to-neutral-900/10 backdrop-blur-xl overflow-hidden h-full flex flex-col`}
        aria-label="Poll card"
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg md:text-xl font-semibold leading-snug text-neutral-900 dark:text-white">
                {account.title}
              </CardTitle>
              <CardDescription className="mt-1 text-neutral-600 dark:text-neutral-300 text-sm md:text-base leading-relaxed line-clamp-1">
                {account.description}
              </CardDescription>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs md:text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Pool
              </p>
              <motion.span
                className="text-lg md:text-xl font-bold tracking-tight font-mono text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #064e3b, #059669, #065f46)",
                  backgroundSize: "200% 200%",
                }}
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {totalReward} SOL
              </motion.span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 ">
          <motion.div
            className="grid grid-cols-3 gap-3 items-end h-full"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.05,
                },
              },
            }}
          >
            {[
              {
                icon: Trophy,
                label: "Per Vote",
                value: `${rewardPerParticipant} SOL`,
              },
              {
                icon: Target,
                label: "Total Votes",
                value: `${totalVotes} / ${maxParticipants}`,
              },
              {
                icon: Shield,
                label: "Required",
                value: reputationLabel,
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{
                  scale: 1.05,
                }}
                className="p-3 rounded-lg bg-neutral-100/10 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700/30 backdrop-blur-sm transition-colors duration-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-800/40"
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <stat.icon className="w-5 h-5 text-neutral-500" />
                  </motion.div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">
                    {stat.label}
                  </p>
                  <p className="text-sm md:text-base font-bold text-neutral-900 dark:text-neutral-100 truncate w-full">
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-3 md:pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-neutral-500" />
            <span className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
              Ends in
            </span>
          </div>
          <time
            dateTime={endIso}
            title={endLabel}
            className="text-sm md:text-base text-neutral-900 dark:text-neutral-200 tabular-nums"
          >
            {remaining}
          </time>
        </CardFooter>

        {/* Bottom curved single-color progress with glow */}
        <div className="absolute left-0 right-0 bottom-0 h-[4px]">
          <div className="relative h-full w-full rounded-b-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800/70">
            <motion.div
              className={`h-full ${barColorClass}`}
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, Math.max(0, participantProgress))}%`,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />

            {/* Glow indicator matching bar color */}
            <motion.div
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 h-[8px] w-[40px] -translate-x-1/2 rounded-full blur-md opacity-70 ${barColorClass}`}
              style={{
                left: `${Math.min(100, Math.max(0, participantProgress))}%`,
              }}
              animate={{ opacity: [0.35, 0.85, 0.35] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>
        {isLocked && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0 bg-neutral-900/40 dark:bg-black/50" />
            <div className="relative z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-neutral-100/90 dark:bg-neutral-900/80 border border-neutral-200/70 dark:border-neutral-700/70 shadow-sm">
                  <Lock className="w-4 h-4 text-neutral-700 dark:text-neutral-200" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                    Locked — Requires {reputationLabel}
                  </span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[11px] leading-snug text-neutral-100 bg-neutral-900/80 border border-neutral-700/60 rounded-md px-3 py-2 max-w-[260px] text-left">
                  <div className="font-semibold mb-1">
                    How to increase reputation
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>First vote or after break: +10</li>
                    <li>Consecutive day vote: +15</li>
                    <li>Same-day extra votes: +5 each</li>
                    <li>Streak bonuses: 7 days +50, 30 days +200</li>
                  </ul>
                  <div className="mt-2 font-semibold">Tiers (by score)</div>
                  <div>
                    Newbie 0–99 • Regular 100–299 • Veteran 300–499 • Legend
                    1000+
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}
