"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import * as anchor from "@coral-xyz/anchor";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProgram } from "@/hooks/useProgram";
import { cn } from "@/lib/utils";
import { Loader2, Share2 } from "lucide-react";

interface Campaign {
  publicKey: anchor.web3.PublicKey;
  account: {
    creator: anchor.web3.PublicKey;
    title: string;
    description: string;
    options: string[];
    reward: anchor.BN;
    participants: anchor.web3.PublicKey[];
    maxParticipants: anchor.BN;
    rewardPerParticipant: anchor.BN;
    voteCount: anchor.BN[];
    totalVotes: anchor.BN;
    minReputation: anchor.BN;
    endDate: anchor.BN;
    isActive: boolean;
    createdAt: anchor.BN;
    updatedAt: anchor.BN;
    bump: number;
  };
}

const PollPage = () => {
  const params = useParams();
  const publicKey = params.publicKey as string;
  const { program, publicKey: userPublicKey, connected } = useProgram();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<number | null>(null);

  useEffect(() => {
    const fetchWithRetry = async (
      fn: () => Promise<any>,
      maxRetries = 3,
      baseDelay = 1000
    ) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error: any) {
          if (
            error.message?.includes("429") ||
            error.message?.includes("Too Many Requests")
          ) {
            if (i === maxRetries - 1) throw error;
            const delay = baseDelay * Math.pow(2, i);
            console.log(`Rate limited, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
    };

    const fetchCampaign = async () => {
      if (!program || !publicKey) return;

      try {
        const campaignPubkey = new anchor.web3.PublicKey(publicKey);

        const campaignAccount = await fetchWithRetry(() =>
          program.account.campaign.fetch(campaignPubkey)
        );

        setCampaign({
          publicKey: campaignPubkey,
          account: campaignAccount,
        });

        // Check if user has already voted
        if (userPublicKey) {
          try {
            const [votePda] = anchor.web3.PublicKey.findProgramAddressSync(
              [
                Buffer.from("vote"),
                campaignPubkey.toBuffer(),
                userPublicKey.toBuffer(),
              ],
              program.programId
            );

            const voteAccount = await fetchWithRetry(() =>
              program.account.vote.fetch(votePda)
            );
            setHasVoted(true);
            setUserVote(voteAccount.choice);
          } catch (error) {
            // Vote doesn't exist, user hasn't voted
            setHasVoted(false);
          }
        }
      } catch (error) {
        console.error("Failed to fetch campaign:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [program, publicKey, userPublicKey]);

  const handleShareBlink = async () => {
    try {
      // Generate the API URL for this poll
      const apiUrl = `${window.location.origin}/api/actions/vote/${publicKey}`;

      // Encode the URL
      const encodedUrl = encodeURIComponent(apiUrl);

      // Create the Blink share URL
      const blinkUrl = `https://dial.to/?action=solana-action:${encodedUrl}&cluster=devnet`;

      // Copy to clipboard
      await navigator.clipboard.writeText(blinkUrl);

      toast({
        title: "Blink URL Copied!",
        description: "Share this link to let others vote via Blink.",
      });
    } catch (error) {
      console.error("Failed to copy Blink URL:", error);
      toast({
        variant: "destructive",
        title: "Failed to Copy",
        description: "Could not copy the Blink URL to clipboard.",
      });
    }
  };

  const handleVote = async () => {
    if (!program || !userPublicKey || !campaign || selectedOption === null)
      return;

    setVoting(true);
    try {
      // Reputation before
      const [reputationPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("reputation"), userPublicKey.toBuffer()],
        program.programId
      );
      const repBeforeAcc = await program.account.userReputation.fetchNullable(
        reputationPda
      );
      const repBefore = repBeforeAcc ? Number(repBeforeAcc.reputationScore) : 0;

      const tx = await program.methods
        .submitVote(selectedOption)
        .accounts({
          voter: userPublicKey,
          campaign: campaign.publicKey,
        })
        .rpc({
          skipPreflight: true,
        });

      console.log("Vote submitted:", tx);

      // Refresh campaign data
      const fetchWithRetry = async (
        fn: () => Promise<any>,
        maxRetries = 3,
        baseDelay = 1000
      ) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (error: any) {
            if (
              error.message?.includes("429") ||
              error.message?.includes("Too Many Requests")
            ) {
              if (i === maxRetries - 1) throw error;
              const delay = baseDelay * Math.pow(2, i);
              console.log(`Rate limited, retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              throw error;
            }
          }
        }
      };

      const updatedCampaign = await fetchWithRetry(() =>
        program.account.campaign.fetch(campaign.publicKey)
      );
      setCampaign({
        ...campaign,
        account: updatedCampaign,
      });

      setHasVoted(true);
      setUserVote(selectedOption);
      setSelectedOption(null);

      // Reputation after
      const repAfterAcc = await program.account.userReputation.fetchNullable(
        reputationPda
      );
      const repAfter = repAfterAcc
        ? Number(repAfterAcc.reputationScore)
        : repBefore;
      const tierKey = repAfterAcc
        ? Object.keys(repAfterAcc.tier || {})[0] || "newbie"
        : "newbie";
      const prettyTier =
        tierKey === "legend"
          ? "Legend"
          : tierKey === "veteran"
          ? "Veteran"
          : tierKey === "regular"
          ? "Regular"
          : "Newbie";
      const delta = Math.max(0, repAfter - repBefore);

      // Cute tiny toast animation
      toast({
        title: delta > 0 ? "✨ Reputation increased!" : "Vote Submitted!",
        description:
          delta > 0
            ? `+${delta} rep • ${prettyTier} (${repAfter}) • +${rewardPerVote.toFixed(4)} SOL credited to your wallet`
            : `Your vote has been recorded successfully. +${rewardPerVote.toFixed(4)} SOL credited to your wallet.`,
      });

      // Let small badges refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("reputation:refresh"));
      }
    } catch (error) {
      console.error("Failed to submit vote:", error);
      toast({
        variant: "destructive",
        title: "Failed to Submit Vote",
        description:
          error instanceof Error
            ? error.message
            : "Unknown error occurred. Please try again.",
      });
    } finally {
      setVoting(false);
    }
  };

  const endMs = useMemo(() => {
    if (!campaign) return 0;
    return campaign.account.endDate.toNumber() * 1000;
  }, [campaign]);

  const [remaining, setRemaining] = useState<string>("");

  useEffect(() => {
    if (!endMs) return;

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-600 dark:text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading poll...
          </p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md border border-neutral-200/50 dark:border-neutral-700/50 shadow-md bg-linear-to-br from-white/40 via-white/60 to-neutral-50/40 dark:from-neutral-900/10 dark:via-neutral-800/40 dark:to-neutral-900/10 backdrop-blur-xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                Poll Not Found
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                The poll you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = endMs <= Date.now();
  const isFull =
    campaign.account.participants.length >=
    campaign.account.maxParticipants.toNumber();

  // Check if user is creator
  const isCreator =
    userPublicKey &&
    campaign.account.creator.toBase58() === userPublicKey.toBase58();

  const canVote =
    connected &&
    !hasVoted &&
    campaign.account.isActive &&
    !isExpired &&
    !isFull &&
    !isCreator; // Disable voting for creators

  const totalVotes = campaign.account.totalVotes.toNumber();
  const rewardPerParticipant =
    campaign.account.reward.toNumber() /
    campaign.account.maxParticipants.toNumber();
  const totalReward = campaign.account.reward.toNumber() / 1e9;
  const rewardPerVote = rewardPerParticipant / 1e9;

  // Check if all options are images
  const allOptionsAreImages = campaign.account.options.every(
    (option) =>
      option.startsWith("Qm") ||
      option.startsWith("bafy") ||
      option.startsWith("bafk")
  );

  // Helper to check if option is an image
  const isImageOption = (option: string) =>
    option.startsWith("Qm") ||
    option.startsWith("bafy") ||
    option.startsWith("bafk");

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 min-h-screen">
      {/* Header Card */}
      <Card className="border border-neutral-200/50 dark:border-neutral-700/50 shadow-md bg-linear-to-br from-white/40 via-white/60 to-neutral-50/40 dark:from-neutral-900/10 dark:via-neutral-800/40 dark:to-neutral-900/10 backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-white mb-2">
                {campaign.account.title}
              </CardTitle>
              <CardDescription className="text-neutral-600 dark:text-neutral-300 text-base leading-relaxed">
                {campaign.account.description}
              </CardDescription>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-2 mb-2">
                <Button
                  onClick={handleShareBlink}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  Share Blink
                </Button>
              </div>
              <p className="text-xs md:text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Pool
              </p>
              <p className="text-xl md:text-2xl font-bold tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-700">
                {totalReward.toFixed(2)} SOL
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-neutral-100/10 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700/30">
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-1">
                Per Vote
              </p>
              <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {rewardPerVote.toFixed(4)} SOL
              </p>
            </div>
            <div className="p-3 rounded-lg bg-neutral-100/10 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700/30">
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-1">
                Participants
              </p>
              <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {campaign.account.participants.length} /{" "}
                {campaign.account.maxParticipants.toNumber()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-neutral-100/10 dark:bg-neutral-800/20 border border-neutral-200 dark:border-neutral-700/30">
              <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium mb-1">
                Ends
              </p>
              <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {remaining || "Ended"}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isCreator
                ? "You are the creator of this poll. Voting is disabled for creators."
                : hasVoted
                ? "You have already voted in this poll"
                : !connected
                ? "Connect your wallet to vote"
                : isExpired
                ? "This poll has ended"
                : isFull
                ? "This poll is full"
                : "Select your choice below"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Creator Stats */}
      {isCreator && connected && (
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 shadow-md backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-blue-900 dark:text-blue-100">
              Creator Dashboard
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              You are the creator of this poll
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium mb-2">
                  Total Votes
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {totalVotes}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium mb-2">
                  Participants
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {campaign.account.participants.length}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium mb-2">
                  Completion
                </p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {Math.round(
                    (campaign.account.participants.length /
                      campaign.account.maxParticipants.toNumber()) *
                      100
                  )}
                  %
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium mb-2">
                  Status
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {campaign.account.isActive
                    ? isExpired
                      ? "Expired"
                      : isFull
                      ? "Full"
                      : "Active"
                    : "Inactive"}
                </p>
              </div>
            </div>
            {/* Vote breakdown by option */}
            <div className="mt-6 pt-6 border-t border-blue-200 dark:border-blue-800">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-4">
                Vote Breakdown:
              </p>
              <div className="space-y-2">
                {campaign.account.options.map((option, index) => {
                  const voteCount =
                    campaign.account.voteCount[index]?.toNumber() || 0;
                  const percentage =
                    totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-800 dark:text-blue-200 font-medium">
                          Option {index + 1}: {voteCount} votes
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2 bg-blue-200 dark:bg-blue-900"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voting Options */}
      <Card className="border border-neutral-200/50 dark:border-neutral-700/50 shadow-md bg-linear-to-br from-white/40 via-white/60 to-neutral-50/40 dark:from-neutral-900/10 dark:via-neutral-800/40 dark:to-neutral-900/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-neutral-900 dark:text-white">
            Vote Options
          </CardTitle>
        </CardHeader>
        <CardContent
          className={cn(
            allOptionsAreImages
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : "space-y-3"
          )}
        >
          {campaign.account.options.map((option, index) => {
            const voteCount =
              campaign.account.voteCount[index]?.toNumber() || 0;
            const percentage =
              totalVotes > 0 && hasVoted ? (voteCount / totalVotes) * 100 : 0;
            const isSelected = selectedOption === index;
            const isUserChoice = userVote === index;
            const isImage = isImageOption(option);

            if (allOptionsAreImages) {
              // Side-by-side image layout for comparison
              return (
                <div
                  key={index}
                  className={cn(
                    "border-2 rounded-lg overflow-hidden transition-all duration-200 relative",
                    isSelected && "border-emerald-500 bg-emerald-500/10",
                    isUserChoice && "border-emerald-500 bg-emerald-500/5",
                    !canVote &&
                      !isUserChoice &&
                      "border-neutral-200 dark:border-neutral-700",
                    canVote &&
                      !isSelected &&
                      !isUserChoice &&
                      "border-neutral-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-600 cursor-pointer"
                  )}
                  onClick={() => canVote && setSelectedOption(index)}
                >
                  <div className="relative w-full aspect-square">
                    <img
                      src={`https://maroon-elegant-leopard-869.mypinata.cloud/ipfs/${option}`}
                      alt={`Option ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {(isSelected || isUserChoice) && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        {isUserChoice ? "Your Vote" : "Selected"}
                      </div>
                    )}
                  </div>
                  {hasVoted && (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Option {index + 1}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-neutral-900 dark:text-white">
                            {voteCount}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2 bg-neutral-200 dark:bg-neutral-700"
                      />
                    </div>
                  )}
                </div>
              );
            }

            // Original layout for mixed text/image options
            return (
              <div
                key={index}
                className={cn(
                  "border-2 rounded-lg p-4 transition-all duration-200",
                  isSelected && "border-emerald-500 bg-emerald-500/10",
                  isUserChoice && "border-emerald-500 bg-emerald-500/5",
                  !canVote &&
                    !isUserChoice &&
                    "border-neutral-200 dark:border-neutral-700",
                  canVote &&
                    !isSelected &&
                    !isUserChoice &&
                    "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer"
                )}
                onClick={() => canVote && setSelectedOption(index)}
              >
                {isImage ? (
                  <>
                    <div className="relative w-full mb-4">
                      <motion.img
                        src={`https://maroon-elegant-leopard-869.mypinata.cloud/ipfs/${option}`}
                        alt={`Option ${index + 1}`}
                        className="w-full h-auto rounded-lg border border-neutral-200 dark:border-neutral-700"
                      />
                      {(isSelected || isUserChoice) && (
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                          {isUserChoice ? "Your Vote" : "Selected"}
                        </div>
                      )}
                    </div>
                    {hasVoted && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Option {index + 1}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-neutral-900 dark:text-white">
                            {voteCount}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                    {hasVoted && (
                      <Progress
                        value={percentage}
                        className="h-2 bg-neutral-200 dark:bg-neutral-700"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <span className="font-semibold text-lg text-neutral-900 dark:text-white">
                          {option}
                        </span>
                        {isUserChoice && (
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20">
                            Your Vote
                          </span>
                        )}
                      </div>
                      {hasVoted && (
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-neutral-900 dark:text-white">
                            {voteCount}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                    {hasVoted && (
                      <Progress
                        value={percentage}
                        className="h-2 mt-3 bg-neutral-200 dark:bg-neutral-700"
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Vote Button */}
      {canVote && selectedOption !== null && (
        <Card className="border border-neutral-200/50 dark:border-neutral-700/50 shadow-md bg-linear-to-br from-white/40 via-white/60 to-neutral-50/40 dark:from-neutral-900/10 dark:via-neutral-800/40 dark:to-neutral-900/10 backdrop-blur-xl">
          <CardContent className="pt-6">
            <Button
              onClick={handleVote}
              disabled={voting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-6 text-lg"
              size="lg"
            >
              {voting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Submitting Vote...
                </>
              ) : (
                "Submit Vote"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PollPage;
