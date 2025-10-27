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
    if (!publicKey) return;

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

    setCampaigns(formattedCampaigns);
  };

  const submitVote = async (choice: number, campaignPubkey: string) => {
    if (!publicKey) return;

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
    if (!publicKey) return;

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
    if (!publicKey) return;

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
    if (!publicKey) return;

    for (const campaign of campaigns) {

        await closeCampaign(campaign.publicKey);

    }

    // Refresh campaigns after closing all
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

  return (
    <div className="font-sans min-h-screen max-w-7xl p-8 mx-auto">
      <Navbar />
      <main>
        <div className="flex justify-center mb-8">
          <PollForm />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {campaigns.map((campaign) => (
            <PollCard key={campaign.publicKey} {...campaign} />
          ))}
        </div>
        <Button onClick={initializePlatform}>Initialize Platform</Button>
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
        <Button onClick={closeAllInactiveCampaigns}>Close All Inactive Campaigns</Button>
      </main>
    </div>
  );
}
