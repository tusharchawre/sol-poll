"use client";

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

// Import wallet adapter CSS
import "./wallet.css";

interface WalletContextProviderProps {
  children: React.ReactNode;
}

export default function WalletContextProvider({
  children,
}: WalletContextProviderProps) {


  return (
    <ConnectionProvider
      endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com"}
    >
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
