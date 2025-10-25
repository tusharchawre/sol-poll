"use client"
import { useProgram } from "@/hooks/useProgram";
import WalletConnect from "../components/wallet/WalletConnect";

export default function Home() {
  const { program, connection, publicKey } = useProgram();

  const handleInitialize = async () => {
    await program.methods.initializePlatform(500).rpc();
  };

  return (
    <div className="font-sans min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Sol Poll</h1>
        <WalletConnect />
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <button onClick={handleInitialize}>Initiate</button>
        </div>
      </main>
    </div>
  );
}
