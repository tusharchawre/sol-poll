import { PublicKey } from "@solana/web3.js";
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  BLOCKCHAIN_IDS,
} from "@solana/actions";
import * as anchor from "@coral-xyz/anchor";
import { Contract } from "@/anchor-idl/idl";
import Idl from "@/anchor-idl/idl.json";

// CAIP-2 format for Solana
const blockchain = BLOCKCHAIN_IDS.devnet;

// Set standardized headers for Blink Providers
const headers = {
  ...ACTIONS_CORS_HEADERS,
  "x-blockchain-ids": blockchain,
  "x-action-version": "2.4",
};

const connection = new anchor.web3.Connection(
  "https://maximum-capable-snow.solana-devnet.quiknode.pro/5bbc70b6982606c396334c7770be01446c46c1d6/"
);
const program = new anchor.Program<Contract>(Idl, { connection });

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ campaignKey: string }> }
) => {
  const { campaignKey } = await params;

  const campaignPDA = new PublicKey(campaignKey);
  const campaign = await program.account.campaign.fetch(campaignPDA);

  // This JSON is used to render the Blink UI
  const response: ActionGetResponse = {
    type: "action",
    icon: `https://plus.unsplash.com/premium_photo-1750672581729-a6da4cb5a0eb?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8&auto=format&fit=crop&q=60&w=900`,
    label: `Vote & Earn ${(Number(campaign.rewardPerParticipant) / 1_000_000_000).toFixed(3)} SOL`,
    title: campaign.title,
    description: `${campaign.description}\n\nReward: ${(Number(campaign.rewardPerParticipant) / 1_000_000_000).toFixed(3)} SOL per vote\nParticipants: ${campaign.participants.length}/${Number(campaign.maxParticipants)}`,
    links: {
      actions: campaign.options.map((option, index) => {
        return {
          type: "transaction",
          label: option,
          href: `${req.url}?choice=${index}`,
        };
      }),
    },
  };

  // Return the response with proper headers
  return new Response(JSON.stringify(response), {
    status: 200,
    headers,
  });
};

export const OPTIONS = async () => {
  return new Response(null, { headers });
};

export const POST = async (
  req: Request,
  { params }: { params: Promise<{ campaignKey: string }> }
) => {
  try {
    const body: ActionPostRequest = await req.json();
    const userPubkey = new PublicKey(body.account);

    // Get choice from URL query params
    const url = new URL(req.url);
    const choice = parseInt(url.searchParams.get("choice") || "0");

    
    const { campaignKey } = await params;
    // Build the vote transaction
    const campaignPDA = new PublicKey(campaignKey);
    const votePDA = getVotePDA(campaignPDA, userPubkey);
    const reputationPDA = getReputationPDA(userPubkey);

    const tx = await program.methods
      .submitVote(choice)
      .accounts({
        voter: userPubkey,
        campaign: campaignPDA,
        // @ts-ignore
        vote: votePDA,
        userReputation: reputationPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    // Set transaction details
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.feePayer = userPubkey;

    // Serialize and encode
    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const base64Tx = serialized.toString('base64');

    console.log("Vote transaction created");

    const payload: ActionPostResponse = {
      type: "transaction",
      transaction: base64Tx,
    };

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    });
  } catch (err) {
    console.error("Error creating vote transaction:", err);
    return Response.json(
      {
        error: "Failed to create vote transaction",
        details: err instanceof Error ? err.message : String(err),
      },
      {
        status: 500,
        headers: headers,
      }
    );
  }
};

function getVotePDA(campaign: PublicKey, voter: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), campaign.toBuffer(), voter.toBuffer()],
    program.programId
  );
  return pda;
}

function getReputationPDA(user: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("reputation"), user.toBuffer()],
    program.programId
  );
  return pda;
}
