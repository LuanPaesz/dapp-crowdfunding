import { Copy, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

function Step({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-white/70 leading-relaxed">{children}</li>;
}

export default function Tutorials() {
  const rpcUrl = (import.meta.env.VITE_RPC_URL as string | undefined) ?? "https://blockfund-rpc.duckdns.org";
  const chainId = 31337; // your Hardhat remote chain id

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/12 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Tutorials / Get started</h1>
            <p className="text-white/60 mt-1">Step-by-step instructions for testers.</p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </section>

      {/* 1 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">1) Create your wallet (MetaMask) + add network (RPC)</h2>
        <div className="text-sm text-white/60 mt-1">
          Add the BlockFund test network to MetaMask using the RPC below.
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50">RPC URL</div>
            <div className="mt-1 font-mono text-sm text-white/80 break-all">{rpcUrl}</div>
            <button
              onClick={() => copy(rpcUrl)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
            >
              <Copy className="w-4 h-4" /> Copy RPC
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50">Chain ID</div>
            <div className="mt-1 font-mono text-sm text-white/80">{chainId}</div>
            <button
              onClick={() => copy(String(chainId))}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
            >
              <Copy className="w-4 h-4" /> Copy Chain ID
            </button>
          </div>
        </div>

        <ol className="list-decimal pl-5 mt-4 space-y-2">
          <Step>Install MetaMask (Chrome/Brave) and create a wallet.</Step>
          <Step>Open MetaMask → <b>Settings</b> → <b>Networks</b> → <b>Add network</b>.</Step>
          <Step>
            Choose <b>Add a network manually</b> and set:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Network name: <b>Hardhat Remote (VM)</b></li>
              <li>RPC URL: <b>{rpcUrl}</b></li>
              <li>Chain ID: <b>{chainId}</b></li>
              <li>Currency symbol: <b>ETH</b></li>
            </ul>
          </Step>
          <Step>Save and switch to the new network.</Step>
          <Step>Return to BlockFund and click <b>Connect Wallet</b>.</Step>
        </ol>
      </div>

      {/* 2 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">2) Get test ETH (for testing)</h2>
        <p className="text-sm text-white/60 mt-1">
          If you are using a public testnet, use a faucet to request test ETH. If you are using a private Hardhat RPC,
          the admin can distribute test ETH or provide funded test accounts.
        </p>
        <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-white/70">
          <li>Copy your MetaMask address.</li>
          <li>Request test ETH from a faucet (public testnets) or from the project admin (private RPC).</li>
          <li>Wait a moment and confirm your balance in MetaMask.</li>
        </ul>
        <p className="text-xs text-white/45 mt-3">⚠️ Never share seed phrases or private keys.</p>
      </div>

      {/* 3 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">3) Create your first campaign</h2>
        <ol className="list-decimal pl-5 mt-3 space-y-2">
          <Step>Go to the <b>Create</b> page.</Step>
          <Step>Fill title and description.</Step>
          <Step>Add media URL (image or video) and a project link (GitHub/website).</Step>
          <Step>Set goal (ETH) and duration (days).</Step>
          <Step>Submit and confirm the transaction in MetaMask.</Step>
          <Step>Your campaign will appear publicly when approved (if approval is enabled).</Step>
        </ol>
      </div>

      {/* 4 */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">4) Donate to a campaign</h2>
        <ol className="list-decimal pl-5 mt-3 space-y-2">
          <Step>Open a campaign card (Explore/Campaigns) or open the campaign detail page.</Step>
          <Step>Enter amount in ETH.</Step>
          <Step>Click <b>Contribute</b> and confirm in MetaMask.</Step>
          <Step>After confirmation, the raised amount updates automatically.</Step>
        </ol>
      </div>
    </div>
  );
}