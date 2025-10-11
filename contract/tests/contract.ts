import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";
import { expect } from "chai";

describe("contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.contract as Program<Contract>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initializePlatform(500).rpc();
    console.log("Your transaction signature", tx);
  });

  it("creates and fetches a campaign", async () => {
    const campaignId = new anchor.BN(1);
    const title = "Test Campaign";
    const description = "Here is a test campaign description.";
    const options = ["Option1", "Option2", "Option3"];
    const reward = new anchor.BN(100_000_000); // 0.1 SOL
    const maxParticipants = new anchor.BN(10);
    const minReputation = new anchor.BN(0);
    const endDate = new anchor.BN(0);

    const creator = (await anchor.AnchorProvider.env().wallet).publicKey;

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
      .accounts({ creator })
      .rpc();

    console.log("tx:", tx);

    // Fetch campaign
    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    console.log("Campaign:", campaignAccount);
  });

  it("submits a vote with new voter", async () => {
    const provider = anchor.getProvider();
    const campaignId = new anchor.BN(1);
    const choice = 0;

    // Get creator (from previous test)
    const creator = provider.wallet.publicKey;

    // Create new voter
    const voter = anchor.web3.Keypair.generate();

    // Airdrop SOL to voter
    const airdropSig = await provider.connection.requestAirdrop(
      voter.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Derive PDAs
    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const [votePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), campaignPda.toBuffer(), voter.publicKey.toBuffer()],
      program.programId
    );

    const [reputationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reputation"), voter.publicKey.toBuffer()],
      program.programId
    );

    // Get voter balance before
    const balanceBefore = await provider.connection.getBalance(voter.publicKey);

    // Submit vote
    const tx = await program.methods
      .submitVote(choice)
      .accounts({
        voter: voter.publicKey,
        campaign: campaignPda,
      })
      .signers([voter]) // Important!
      .rpc();

    console.log("Vote tx:", tx);

    // Fetch accounts
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
    const balanceAfter = await provider.connection.getBalance(voter.publicKey);
    console.log("Balance change:", (balanceAfter - balanceBefore) / 1e9, "SOL");
  });

  it("prevents double voting", async () => {
    const provider = anchor.getProvider();
    const campaignId = new anchor.BN(1);
    const choice = 0;

    const creator = provider.wallet.publicKey;

    // Use the same voter from previous test (or create new one)
    const voter = anchor.web3.Keypair.generate();

    // Airdrop SOL to voter
    const airdropSig = await provider.connection.requestAirdrop(
      voter.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Derive campaign PDA
    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // First vote - should succeed
    await program.methods
      .submitVote(choice)
      .accounts({
        voter: voter.publicKey,
        campaign: campaignPda,
      })
      .signers([voter])
      .rpc();

    console.log("First vote succeeded");

    // Second vote - should fail
    try {
      await program.methods
        .submitVote(choice)
        .accounts({
          voter: voter.publicKey,
          campaign: campaignPda,
        })
        .signers([voter])
        .rpc();

      expect.fail("Should have thrown error for double vote");
    } catch (error) {
      console.log("Double vote prevented ✓");
      expect(error.message).to.include("already in use"); // Vote PDA already exists
    }
  });

  it("handles multiple voters and completes campaign", async () => {
    const provider = anchor.getProvider();
    const campaignId = new anchor.BN(2); // New campaign
    const creator = provider.wallet.publicKey;

    // Create campaign with only 3 max participants
    const title = "Multi Voter Campaign";
    const description = "Testing multiple voters";
    const options = ["A", "B", "C"];
    const reward = new anchor.BN(300_000_000); // 0.3 SOL
    const maxParticipants = new anchor.BN(3); // Small number for testing
    const minReputation = new anchor.BN(0);
    const endDate = new anchor.BN(0);

    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // Create campaign
    await program.methods
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
      .accounts({ creator })
      .rpc();

    console.log("Campaign created with 3 max participants");

    // Create 3 voters
    const voters = [];
    for (let i = 0; i < 3; i++) {
      const voter = anchor.web3.Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        voter.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
      voters.push(voter);
    }

    // All 3 vote
    for (let i = 0; i < 3; i++) {
      const choice = i % 3; // Distribute votes across options
      await program.methods
        .submitVote(choice)
        .accounts({
          voter: voters[i].publicKey,
          campaign: campaignPda,
        })
        .signers([voters[i]])
        .rpc();

      console.log(`Voter ${i + 1} voted for option ${choice}`);
    }

    // Check campaign is now inactive
    const campaignAccount = await program.account.campaign.fetch(campaignPda);
    expect(campaignAccount.isActive).to.be.false;
    expect(campaignAccount.totalVotes.toNumber()).to.equal(3);

    console.log("✅ Campaign completed and deactivated!");
    console.log(
      "Vote counts:",
      campaignAccount.voteCount.map((v) => v.toString())
    );
  });

  it("cancels campaign before any votes", async () => {
    const provider = anchor.getProvider();
    const campaignId = new anchor.BN(3); // New campaign
    const creator = provider.wallet.publicKey;

    // Create campaign
    const title = "Cancellable Campaign";
    const description = "This will be cancelled";
    const options = ["X", "Y"];
    const reward = new anchor.BN(50_000_000); // 0.05 SOL
    const maxParticipants = new anchor.BN(5);
    const minReputation = new anchor.BN(0);
    const endDate = new anchor.BN(0);

    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
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
      .accounts({ creator })
      .rpc();

    console.log("Campaign created");

    // Get creator balance before cancel
    const balanceBefore = await provider.connection.getBalance(creator);

    // Cancel campaign
    const tx = await program.methods
      .cancelCampaign()
      .accounts({
        campaign: campaignPda,
      })
      .rpc();

    console.log("Cancel tx:", tx);

    // Check refund received
    const balanceAfter = await provider.connection.getBalance(creator);
    console.log(
      "Refund received:",
      (balanceAfter - balanceBefore) / 1e9,
      "SOL"
    );

    console.log("✅ Campaign cancelled and refunded!");
  });


  it("closes completed campaign and collects dust", async () => {
    const provider = anchor.getProvider();
    const campaignId = new anchor.BN(4); // New campaign
    const creator = provider.wallet.publicKey;
  
    // Create small campaign
    const title = "Closeable Campaign";
    const description = "Will be closed after completion";
    const options = ["P", "Q"];
    const reward = new anchor.BN(20_000_000); // 0.02 SOL
    const maxParticipants = new anchor.BN(2);
    const minReputation = new anchor.BN(0);
    const endDate = new anchor.BN(0);
  
    const [campaignPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("campaign"),
        creator.toBuffer(),
        campaignId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
  
    // Create campaign
    await program.methods
      .createCampaign(
        campaignId, title, description, options,
        reward, maxParticipants, minReputation, endDate
      )
      .accounts({ creator })
      .rpc();
  
    // Create 2 voters and vote
    for (let i = 0; i < 2; i++) {
      const voter = anchor.web3.Keypair.generate();
      const airdropSig = await provider.connection.requestAirdrop(
        voter.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
  
      await program.methods
        .submitVote(i)
        .accounts({
          voter: voter.publicKey,
          campaign: campaignPda,
        })
        .signers([voter])
        .rpc();
    }
  
    console.log("Campaign completed");
  
    // Get platform config balance before
    const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    const configBalanceBefore = await provider.connection.getBalance(configPda);
  
    // Close campaign
    const tx = await program.methods
      .closeCampaign()
      .accounts({
        campaign: campaignPda,
      })
      .rpc();
  
    console.log("Close tx:", tx);
  
    // Check dust collected
    const configBalanceAfter = await provider.connection.getBalance(configPda);
    const dustCollected = configBalanceAfter - configBalanceBefore;
    
    console.log("Dust collected:", dustCollected / 1e9, "SOL");
    console.log("✅ Campaign closed successfully!");
  });
});
