import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Contract } from "../target/types/contract";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Contract as Program<Contract>;

  const tx = await program.methods
    .initializePlatform(500) // 5% fee
    .rpc();

  console.log("✅ Platform initialized! TX:", tx);
}

main().catch(console.error);