"use client"
import { useProgram } from "@/hooks/useProgram";
import WalletConnect from "../components/wallet/WalletConnect";
import { PublicKey } from "@solana/web3.js";
import Navbar from "./components/Navbar";

export default function Home() {
  const { program, connection, publicKey, connected } = useProgram();




  return (
    <div className="font-sans min-h-screen max-w-7xl p-8 mx-auto">
      <Navbar />
    <main>

    </main>
    </div>
  );
}