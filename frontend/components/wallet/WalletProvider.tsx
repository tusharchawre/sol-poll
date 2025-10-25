"use client";

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";

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
      endpoint={"https://solana-devnet.g.alchemy.com/v2/14o1ZelJNlGJxG2O1lx8m"}
    >
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
