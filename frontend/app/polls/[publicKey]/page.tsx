"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as anchor from "@coral-xyz/anchor";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  Trophy,
  Users,
  Vote,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { constructFromSymbol } from "date-fns/constants";

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
            const delay = baseDelay * Math.pow(2, i); // Exponential backoff
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
        alert(
          `Failed to load poll: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, []); // Only run on mount

  const handleVote = async () => {
    if (!program || !userPublicKey || !campaign || selectedOption === null)
      return;

    setVoting(true);
    try {
      const tx = await program.methods
        .submitVote(selectedOption)
        .accounts({
          voter: userPublicKey,
          campaign: campaign.publicKey,
        })
        .rpc();

      console.log("Vote submitted:", tx);

      // Refresh campaign data with retry logic
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
    } catch (error) {
      console.error("Failed to submit vote:", error);
      alert(
        `Failed to submit vote: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-neutral-400 text-lg">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-neutral-800 border-neutral-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-3">
                Poll Not Found
              </h2>
              <p className="text-neutral-400 text-lg">
                The poll you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = Date.now() / 1000 > campaign.account.endDate.toNumber();
  const isFull =
    campaign.account.participants.length >=
    campaign.account.maxParticipants.toNumber();
  const canVote =
    connected &&
    !hasVoted &&
    campaign.account.isActive &&
    !isExpired &&
    !isFull;

  const totalVotes = campaign.account.totalVotes.toNumber();
  const maxVotes = Math.max(
    ...campaign.account.voteCount.map((v) => v.toNumber()),
    1
  );

  const rewardPerParticipant =
    campaign.account.reward.toNumber() /
    campaign.account.maxParticipants.toNumber();

  return (
    <div className="min-h-screen bg-neutral-900 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Card */}
        <Card className="bg-neutral-800 border-neutral-700">
          <CardHeader className="pb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <CardTitle className="text-3xl font-bold text-white">
                  {campaign.account.title}
                </CardTitle>
                <CardDescription className="text-neutral-300 text-lg leading-relaxed">
                  {campaign.account.description}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2 ml-6">
                {campaign.account.isActive ? (
                  <div className="flex items-center space-x-2 bg-emerald-600/20 px-3 py-1 rounded-full">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-red-600/20 px-3 py-1 rounded-full">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-neutral-700 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">
                      Ends
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {formatDistanceToNow(
                        new Date(campaign.account.endDate.toNumber() * 1000),
                        { addSuffix: true }
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-700 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">
                      Participants
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {campaign.account.participants.length} /{" "}
                      {campaign.account.maxParticipants.toNumber()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-700 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">
                      Total Reward
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {(
                        campaign.account.reward.toNumber() /
                        anchor.web3.LAMPORTS_PER_SOL
                      ).toFixed(3)}{" "}
                      SOL
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-neutral-700 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Vote className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">
                      Reward per Vote
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {(
                        rewardPerParticipant / anchor.web3.LAMPORTS_PER_SOL
                      ).toFixed(4)}{" "}
                      SOL
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voting Options */}
        <Card className="bg-neutral-800 border-neutral-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-white">
              <Vote className="w-6 h-6 text-blue-400" />
              <span className="text-xl">Vote Options</span>
            </CardTitle>
            <CardDescription className="text-neutral-400">
              {hasVoted
                ? "You have already voted in this poll"
                : "Select your choice below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaign.account.options.map((option, index) => {
              const voteCount =
                campaign.account.voteCount[index]?.toNumber() || 0;
              const percentage =
                totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
              const isSelected = selectedOption === index;
              const isUserChoice = userVote === index;

              return (
                <div
                  key={index}
                  className={cn(
                    "border-2 rounded-xl p-6 transition-all duration-200",
                    isSelected && "border-blue-500 bg-blue-500/10",
                    isUserChoice && "border-emerald-500 bg-emerald-500/10",
                    !canVote &&
                      !isUserChoice &&
                      "border-neutral-600 bg-neutral-700/50",
                    canVote &&
                      !isSelected &&
                      !isUserChoice &&
                      "border-neutral-600 hover:border-neutral-500 cursor-pointer bg-neutral-700/30",
                    isUserChoice && "border-emerald-500 bg-emerald-500/5"
                  )}
                  onClick={() => canVote && setSelectedOption(index)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {isUserChoice && (
                        <div className="flex items-center space-x-2 bg-emerald-600/20 px-3 py-1 rounded-full">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">
                            Your Vote
                          </span>
                        </div>
                      )}
                      {option.startsWith("Qm") || option.startsWith("bafy") ? (
                        <img
                          src={`https://maroon-elegant-leopard-869.mypinata.cloud/ipfs/${option}`}
                          alt={`Option ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border-2 border-neutral-500"
                        />
                      ) : (
                        <span className="font-semibold text-lg text-white">
                          {option}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {voteCount}
                      </div>
                      <div className="text-sm text-neutral-400">
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-3 bg-neutral-600" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Vote Button */}
        {canVote && selectedOption !== null && (
          <Card className="bg-neutral-800 border-neutral-700">
            <CardContent className="pt-6">
              <Button
                onClick={handleVote}
                disabled={voting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 text-lg"
                size="lg"
              >
                {voting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Submitting Vote...
                  </>
                ) : (
                  <>
                    <Vote className="w-5 h-5 mr-3" />
                    Submit Vote
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status Messages */}
        {!connected && (
          <Card className="border-yellow-600 bg-yellow-600/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-yellow-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-lg">
                  Please connect your wallet to vote
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {hasVoted && (
          <Card className="border-emerald-600 bg-emerald-600/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-lg">
                  You have successfully voted in this poll
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {isExpired && (
          <Card className="border-red-600 bg-red-600/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-red-400">
                <Clock className="w-5 h-5" />
                <span className="text-lg">This poll has ended</span>
              </div>
            </CardContent>
          </Card>
        )}

        {isFull && (
          <Card className="border-orange-600 bg-orange-600/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 text-orange-400">
                <Users className="w-5 h-5" />
                <span className="text-lg">This poll is full</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PollPage;
