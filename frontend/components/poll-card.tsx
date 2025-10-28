import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import { Users, Trophy, Clock, DollarSign, Target } from "lucide-react";
import Link from "next/link";

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

  return (
    <Link href={`/polls/${publicKey}`}>
      <Card
        className={`${className} hover:shadow-lg transition-shadow duration-300 border border-neutral-200 dark:border-neutral-700 shadow-md bg-white dark:bg-neutral-900 cursor-pointer`}
        aria-label="Poll card"
      >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              {account.title}
            </CardTitle>
            <CardDescription className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed">
              {account.description}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-1 ml-4">
            {account.isActive ? (
              <div className="w-3 h-3 bg-neutral-500 rounded-full animate-pulse"></div>
            ) : (
              <div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600 rounded-full"></div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Reward Pool */}
        <div className="flex items-center space-x-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
            <DollarSign className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Reward Pool
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">
              {totalReward} SOL
            </p>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Participants
              </span>
            </div>
            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
              {account.participants.length} / {maxParticipants}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-neutral-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${participantProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Reward per Participant */}
        <div className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="p-2 bg-neutral-200 dark:bg-neutral-700 rounded-full">
            <Trophy className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Reward per Vote
            </p>
            <p className="text-lg font-bold text-neutral-900 dark:text-white">
              {rewardPerParticipant} SOL
            </p>
          </div>
        </div>

        {/* Vote Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Target className="w-4 h-4 text-neutral-500 mr-1" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Total Votes
              </span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">
              {totalVotes}
            </p>
          </div>
          <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-neutral-500 mr-1" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Min Reputation
              </span>
            </div>
            <p className="text-xl font-bold text-neutral-900 dark:text-white">
              {reputationLabel}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-neutral-500" />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Ends
          </span>
        </div>
        <time
          dateTime={endIso}
          className="font-semibold text-neutral-900 dark:text-white"
        >
          {endLabel}
        </time>
      </CardFooter>
    </Card>
   </Link>
  );
}
