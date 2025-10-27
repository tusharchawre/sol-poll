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
      endpoint={"https://maximum-capable-snow.solana-devnet.quiknode.pro/5bbc70b6982606c396334c7770be01446c46c1d6/"}
    >
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
