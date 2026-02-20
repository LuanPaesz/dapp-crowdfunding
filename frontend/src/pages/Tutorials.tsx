import { Copy, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

function Step({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-white/70 leading-relaxed">{children}</li>;
}

function isAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v.trim());
}

export default function Tutorials() {
  const rpcUrl =
    (import.meta.env.VITE_RPC_URL as string | undefined) ??
    "https://blockfund-rpc.duckdns.org";
  const chainId = 31337; // your Hardhat remote chain id

  // Google Form base (no "pp_url" here; we will build it)
  const FORM_BASE =
    "https://docs.google.com/forms/d/e/1FAIpQLSf-SiMM8qUvwSUEHOaiXOTCVDPsN3F6BRUZ00-MeJIl6-vNqw/viewform";

  // Entry IDs extracted from your prefill link
  const ENTRY_WALLET = "entry.457660299";
  const ENTRY_NAME = "entry.1214837844";

  const [testerName, setTesterName] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const requestUrl = useMemo(() => {
    const u = new URL(FORM_BASE);
    u.searchParams.set("usp", "pp_url");

    if (walletAddr.trim()) u.searchParams.set(ENTRY_WALLET, walletAddr.trim());
    if (testerName.trim()) u.searchParams.set(ENTRY_NAME, testerName.trim());

    return u.toString();
  }, [walletAddr, testerName]);

  async function copy(text: string, key?: string) {
    try {
      await navigator.clipboard.writeText(text);
      if (key) {
        setCopied(key);
        setTimeout(() => setCopied(null), 1200);
      }
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
              onClick={() => copy(rpcUrl, "rpc")}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
            >
              <Copy className="w-4 h-4" /> {copied === "rpc" ? "Copied!" : "Copy RPC"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50">Chain ID</div>
            <div className="mt-1 font-mono text-sm text-white/80">{chainId}</div>
            <button
              onClick={() => copy(String(chainId), "chain")}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
            >
              <Copy className="w-4 h-4" /> {copied === "chain" ? "Copied!" : "Copy Chain ID"}
            </button>
          </div>
        </div>

        <ol className="list-decimal pl-5 mt-4 space-y-2">
          <Step>Install MetaMask (Chrome/Brave/Edge) and create a wallet.</Step>
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
          This is a private Hardhat RPC (no public faucet). To test the app, request <b>10 test ETH</b> from the admin.
        </p>

        <ol className="list-decimal pl-5 mt-3 space-y-2">
          <Step>
            In MetaMask, click your account name/address at the top to copy your wallet address
            (it starts with <b>0x…</b>).
          </Step>
          <Step>
            Paste your address below and click <b>Open request form</b>. The form will be pre-filled.
          </Step>
          <Step>
            Submit the form. The admin will send <b>10 test ETH</b> manually to your wallet.
          </Step>
          <Step>
            Wait a moment and confirm your balance in MetaMask (Assets tab).
          </Step>
        </ol>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-xs text-white/50">Your name / tester ID</div>
            <input
              value={testerName}
              onChange={(e) => setTesterName(e.target.value)}
              placeholder="e.g., John / Tester-01"
              className="w-full bg-transparent outline-none text-sm text-white/80 placeholder:text-white/35"
            />
          </div>

          <div className="md:col-span-8 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-xs text-white/50">Your MetaMask wallet address (0x...)</div>
            <input
              value={walletAddr}
              onChange={(e) => setWalletAddr(e.target.value)}
              placeholder="0x1234... (copy from MetaMask)"
              className="w-full bg-transparent outline-none text-sm font-mono text-white/80 placeholder:text-white/35"
            />
            {!!walletAddr && !isAddress(walletAddr) && (
              <div className="text-xs text-red-300 mt-1">
                Please paste a valid address (0x + 40 hex chars).
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => copy(walletAddr.trim(), "addr")}
            disabled={!walletAddr.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            {copied === "addr" ? "Copied!" : "Copy address"}
          </button>

          <a
            href={requestUrl}
            target="_blank"
            rel="noreferrer"
            className={
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition " +
              (isAddress(walletAddr) || !walletAddr.trim()
                ? "border-purple-500/25 bg-purple-500/10 hover:bg-purple-500/15"
                : "border-white/10 bg-white/5 hover:bg-white/10")
            }
          >
            <ExternalLink className="w-4 h-4" />
            Open request form
          </a>
        </div>

        <p className="text-xs text-white/45 mt-3">
          ⚠️ Never share seed phrases or private keys. Only share your public wallet address (0x…).
        </p>
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