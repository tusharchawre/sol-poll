"use client";
import * as anchor from "@coral-xyz/anchor";
import { useProgram } from "@/hooks/useProgram";
import WalletConnect from "../components/wallet/WalletConnect";
import { PublicKey } from "@solana/web3.js";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import PollCard from "../components/poll-card";
import { useState, useEffect } from "react";
import PollForm from "@/components/poll-form";

export default function Home() {
  const { program, connection, publicKey, connected } = useProgram();
  const [campaigns, setCampaigns] = useState<
    {
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
    }[]
  >([]);

  const handleCreateCampaign = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    // Platform config should already be initialized
    // If not, you may need to run initializePlatform separately

    const campaignId = new anchor.BN(Math.floor(Math.random() * 1000000));
    const title = "New Tushar Chawre";
    const description = "Here is a tushar campaign description.";
    const options = ["Option5", "Option5", "Option7"];
    const reward = new anchor.BN(1_000_000_000); // 0.1 SOL
    const maxParticipants = new anchor.BN(10);
    const minReputation = new anchor.BN(0); // Newbie tier
    const endDate = new anchor.BN(Math.floor(Date.now() / 1000) + 7200); // 2 hours from now

    const creator = publicKey;

    // Derive campaign PDA
    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const tx = await program.methods
      .createCampaign(
        campaignId,
        title,
        description,
        options,
        reward,
        maxParticipants,
        minReputation,
        endDate
      )
      .accounts({
        creator,
      })
      .rpc();

    console.log("tx:", tx);

    // Fetch campaign
    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    console.log("Campaign:", campaignAccount);

    // Convert to readable format
    const readableCampaign = {
      publicKey: campaignPda.toBase58(),
      account: {
        creator: campaignAccount.creator.toBase58(),
        title: campaignAccount.title,
        description: campaignAccount.description,
        options: campaignAccount.options,
        reward: campaignAccount.reward.toNumber() / 1e9, // Convert lamports to SOL
        participants: campaignAccount.participants.map((p) => p.toBase58()),
        maxParticipants: campaignAccount.maxParticipants.toNumber(),
        rewardPerParticipant:
          campaignAccount.rewardPerParticipant.toNumber() / 1e9, // Convert lamports to SOL
        voteCount: campaignAccount.voteCount.map((v) => v.toNumber()),
        totalVotes: campaignAccount.totalVotes.toNumber(),
        minReputation: campaignAccount.minReputation.toNumber(),
        endDate: new Date(
          campaignAccount.endDate.toNumber() * 1000
        ).toLocaleString(), // Convert timestamp to readable date
        isActive: campaignAccount.isActive,
        createdAt: new Date(
          campaignAccount.createdAt.toNumber() * 1000
        ).toLocaleString(),
        updatedAt: new Date(
          campaignAccount.updatedAt.toNumber() * 1000
        ).toLocaleString(),
        bump: campaignAccount.bump,
      },
    };

    console.log("Readable Campaign:", readableCampaign);

    // Refresh campaigns after creating
    fetchCampaigns();
  };

  const initializePlatform = async () => {
    if (!connected || !publicKey) return;

    const tx = await program.methods
      .initializePlatform(500) // 5% as u16 (500 basis points)
      .accounts({
        authority: publicKey,
      })
      .rpc();

    console.log("Platform initialized:", tx);
  };

  const fetchCampaigns = async () => {
    const rawCampaigns = await program.account.campaign.all();
    console.log("Campaigns:", rawCampaigns);

    const formattedCampaigns = rawCampaigns.map((c) => ({
      publicKey: c.publicKey.toBase58(),
      account: {
        creator: c.account.creator.toBase58(),
        title: c.account.title,
        description: c.account.description,
        options: c.account.options,
        reward: c.account.reward.toString(16),
        participants: c.account.participants.map((p) => p.toBase58()),
        maxParticipants: c.account.maxParticipants.toString(16),
        rewardPerParticipant: c.account.rewardPerParticipant.toString(16),
        voteCount: c.account.voteCount.map((v) => v.toString(16)),
        totalVotes: c.account.totalVotes.toString(16),
        minReputation: c.account.minReputation.toString(16),
        endDate: c.account.endDate.toString(16),
        isActive: c.account.isActive,
        createdAt: c.account.createdAt.toString(16),
        updatedAt: c.account.updatedAt.toString(16),
        bump: c.account.bump,
      },
    }));

    // Sort: non-ended first, then by highest reward; ended polls at bottom
    const nowMs = Date.now();
    formattedCampaigns.sort((a, b) => {
      const endA = parseInt(a.account.endDate, 16) * 1000;
      const endB = parseInt(b.account.endDate, 16) * 1000;
      const endedA = isNaN(endA) ? false : endA <= nowMs;
      const endedB = isNaN(endB) ? false : endB <= nowMs;

      if (endedA !== endedB) return endedA ? 1 : -1;

      const rewardA = parseInt(a.account.reward, 16) || 0;
      const rewardB = parseInt(b.account.reward, 16) || 0;
      return rewardB - rewardA; // highest paying first
    });

    setCampaigns(formattedCampaigns);
  };

  const submitVote = async (choice: number, campaignPubkey: string) => {
    if (!connected || !publicKey) return;

    const campaignPda = new PublicKey(campaignPubkey);
    const voter = publicKey;

    const balenceBefore = await connection.getBalance(voter);

    const [votePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), campaignPda.toBuffer(), voter.toBuffer()],
      program.programId
    );

    const [reputationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), voter.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .submitVote(choice)
      .accounts({
        voter,
        campaign: campaignPda,
      })
      .rpc({
        skipPreflight: true,
      });

    console.log("tx:", tx);

    const voteAccount = await program.account.vote.fetch(votePda);
    const reputationAccount = await program.account.userReputation.fetch(
      reputationPda
    );
    const campaignAccount = await program.account.campaign.fetch(campaignPda);

    console.log("Vote choice:", voteAccount.choice);
    console.log("Reputation score:", reputationAccount.reputationScore);
    console.log("Total votes:", campaignAccount.totalVotes.toString());
    console.log("Vote Count", campaignAccount.voteCount.toString());

    // Check balance increased (got reward)
    const balanceAfter = await connection.getBalance(voter);
    console.log("Balance change:", (balanceAfter - balenceBefore) / 1e9, "SOL");

    // Refresh campaigns after voting
    fetchCampaigns();
  };

  const withdrawFees = async () => {
    if (!connected || !publicKey) return;

    console.log("Withdrawing fees...");
    const tx = await program.methods
      .withdrawFees()
      .accounts({
        authority: publicKey,
      })
      .rpc();

    console.log("tx:", tx);
  };

  const closeCampaign = async (campaignPubkey: string) => {
    if (!connected || !publicKey) return;

    const campaignPda = new PublicKey(campaignPubkey);

    // Derive platform_config PDA
    const [platformConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    const tx = await (program.methods.closeCampaign() as any)
      .accounts({
        campaign: campaignPda,
        platformConfig: platformConfigPda,
      })
      .rpc({
        skipPreflight: true,
      });

    console.log("Campaign closed:", tx);
  };

  const closeAllInactiveCampaigns = async () => {
    if (!connected || !publicKey) return;

    // Close the specific campaign by public key provided
    await closeCampaign("FX7abdPuP2NK38VkGQWueiZZPbUvgEAVqTvgjkv3oufu");

    // Refresh campaigns after closing
    fetchCampaigns();
  };

  const fetchPlatformConfig = async () => {
    const config = await program.account.platformConfig.all();

    const balance = await connection.getBalance(config[0].publicKey);
    console.log("Balance:", balance / 1e9, "SOL");
    console.log("Platform Config:", config);
  };

  useEffect(() => {
    if (program) {
      fetchCampaigns();
    }
  }, []);

  // Listen for refresh requests from other components (e.g., after creating a poll)
  useEffect(() => {
    const handler = () => {
      fetchCampaigns();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("campaigns:refresh", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "campaigns:refresh",
          handler as EventListener
        );
      }
    };
  }, [program]);

  return (
    <main>
      <section className="relative mb-10 overflow-hidden rounded-2xl border border-neutral-200/60 bg-gradient-to-b from-white to-neutral-50 p-6 shadow-sm dark:border-neutral-800/60 dark:from-neutral-950 dark:to-neutral-900">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-400/30 blur-3xl" />
        </div>

        <div className="flex flex-col items-center text-center gap-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/60 px-3 py-1 text-xs font-medium text-neutral-700 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            On-chain, incentivized polls on Solana
          </div>

          <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-neutral-900 dark:text-white md:text-4xl lg:text-5xl">
            Vote. Earn. Build Reputation on Solana.
          </h1>
          <p className="mx-auto max-w-2xl text-neutral-600 dark:text-neutral-400">
            Create and participate in on-chain polls with real SOL rewards. Gate
            by reputation, cap participants, and grow a credible voting
            history—all secured by Solana.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">

            <Button
              variant="secondary"
              onClick={() => {
                const el = document.getElementById("polls");
                if (el)
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Explore Polls
            </Button>
          </div>

          <div className="mt-4 grid w-full max-w-3xl grid-cols-2  gap-3 items-center">
            <div className="rounded-xl border border-neutral-400/60 bg-white/60 p-3 text-sm dark:border-neutral-700/60 dark:bg-neutral-900/40">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Active polls
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {campaigns.filter((c) => c.account.isActive).length}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-400/60 bg-white/60 p-3 text-sm dark:border-neutral-700/60 dark:bg-neutral-900/40">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Total reward pool
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {(() => {
                  try {
                    const total = campaigns.reduce((sum, c) => {
                      const v = parseInt(
                        c.account.reward as unknown as string,
                        16
                      );
                      return sum + (isNaN(v) ? 0 : v);
                    }, 0);
                    return `${(total / 1e9).toFixed(2)} SOL`;
                  } catch {
                    return "0.00 SOL";
                  }
                })()}
              </div>
            </div>
            {/* <div className="rounded-xl border border-neutral-200/60 bg-white/60 p-3 text-sm dark:border-neutral-800/60 dark:bg-neutral-900/40">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Votes cast
              </div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {campaigns.reduce((sum, c) => {
                  const v = parseInt(
                    c.account.totalVotes as unknown as string,
                    16
                  );
                  return sum + (isNaN(v) ? 0 : v);
                }, 0)}
              </div>
            </div> */}
          </div>
        </div>
      </section>

      <div
        id="polls"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 items-stretch"
      >
        {campaigns.map((campaign) => (
          <PollCard key={campaign.publicKey} {...campaign} />
        ))}
      </div>
      {/* <Button onClick={initializePlatform}>Initialize Platform</Button>
      <Button onClick={handleCreateCampaign}>Create Campaign (Old)</Button>
      <Button onClick={fetchCampaigns}>Fetch Campaigns</Button>
      <Button
        onClick={() =>
          submitVote(0, "EkTem6B3sMzezCm3Cg79cLWw9RRXVegQDnTNWhYdNBxn")
        }
      >
        Submit Vote
      </Button>
      <Button onClick={withdrawFees}>Withdraw Fees</Button>
      <Button onClick={fetchPlatformConfig}>Fetch Platform Config</Button>
      <Button onClick={closeAllInactiveCampaigns}>
        Close All Inactive Campaigns
      </Button> */}
    </main>
  );
}
