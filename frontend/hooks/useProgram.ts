"use client";

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import Idl from "../anchor-idl/idl.json";
import { Contract } from "@/anchor-idl/idl";

interface UseProgramReturn {
  program: anchor.Program<Contract>
  publicKey: PublicKey | null;
  connected: boolean;
  connection: anchor.web3.Connection;
}

/**
 * A hook that provides access to the Solana program,
 * connected wallet, and connection.
 * This hook handles the basic setup for the program.
 */
export function useProgram(): UseProgramReturn {

  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  // Program initialization - conditionally create with provider if wallet connected
  let program;
  if (wallet) {
    // Create a provider with the wallet for transaction signing
    const provider = new anchor.AnchorProvider(connection, wallet, {
      preflightCommitment: "confirmed",
    });
    program = new anchor.Program<Contract>(Idl, provider);
  } else {
    // Create program with just connection for read-only operations
    program = new anchor.Program<Contract>(Idl, { connection });
  }

 
  return {
    program,
    publicKey,
    connected,
    connection,
  };
}
