import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";

type StepProps = Readonly<{
  children: ReactNode;
}>;

function Step({ children }: StepProps) {
  return <li className="text-sm leading-relaxed text-white/70">{children}</li>;
}

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export default function Tutorials() {
  const rpcUrl =
    String(import.meta.env.VITE_RPC_URL ?? "") ||
    "https://blockfund-rpc.duckdns.org";

  const chainId = 31337;

  const metamaskUrl = "https://metamask.io/download/";

  const formBase =
    "https://docs.google.com/forms/d/e/1FAIpQLSf-SiMM8qUvwSUEHOaiXOTCVDPsN3F6BRUZ00-MeJIl6-vNqw/viewform";

  const finalEvaluationUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSdUXU8sjCbrkCfOAsauAGWz1RuvxNoVl820pXvoxypvzt_RSA/viewform?usp=sharing&ouid=114785910683588446101";

  const entryWallet = "entry.457660299";
  const entryName = "entry.1214837844";

  const [testerName, setTesterName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const requestUrl = useMemo(() => {
    const url = new URL(formBase);
    url.searchParams.set("usp", "pp_url");

    if (walletAddress.trim()) {
      url.searchParams.set(entryWallet, walletAddress.trim());
    }

    if (testerName.trim()) {
      url.searchParams.set(entryName, testerName.trim());
    }

    return url.toString();
  }, [walletAddress, testerName]);

  async function copy(text: string, key?: string) {
    try {
      await navigator.clipboard.writeText(text);

      if (key) {
        setCopied(key);

        globalThis.setTimeout(() => {
          setCopied(null);
        }, 1200);
      }
    } catch {
      // ignore clipboard errors
    }
  }

  const requestButtonClass =
    isAddress(walletAddress) || !walletAddress.trim()
      ? "border-purple-500/25 bg-purple-500/10 hover:bg-purple-500/15"
      : "border-white/10 bg-white/5 hover:bg-white/10";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/12 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tutorials / Get started</h1>
            <p className="mt-1 text-white/60">
              Step-by-step instructions for testers.
            </p>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </section>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">
          1) Create your wallet (MetaMask) + add network (RPC)
        </h2>
        <div className="mt-1 text-sm text-white/60">
          Add the BlockFund test network to MetaMask using the RPC below.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={metamaskUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-sm transition hover:bg-purple-500/15"
          >
            <ExternalLink className="h-4 w-4" />
            Install MetaMask
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50">RPC URL</div>
            <div className="mt-1 break-all font-mono text-sm text-white/80">
              {rpcUrl}
            </div>
            <button
              type="button"
              onClick={() => copy(rpcUrl, "rpc")}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <Copy className="h-4 w-4" />
              {copied === "rpc" ? "Copied!" : "Copy RPC"}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50">Chain ID</div>
            <div className="mt-1 font-mono text-sm text-white/80">{chainId}</div>
            <button
              type="button"
              onClick={() => copy(String(chainId), "chain")}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <Copy className="h-4 w-4" />
              {copied === "chain" ? "Copied!" : "Copy Chain ID"}
            </button>
          </div>
        </div>

        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <Step>
            Install MetaMask using the direct link above and create your wallet.
          </Step>
          <Step>
            Open MetaMask → <b>Settings</b> → <b>Networks</b> → <b>Add network</b>.
          </Step>
          <Step>
            Choose <b>Add a network manually</b> and set:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Network name: <b>Hardhat Remote (VM)</b>
              </li>
              <li>
                RPC URL: <b>{rpcUrl}</b>
              </li>
              <li>
                Chain ID: <b>{chainId}</b>
              </li>
              <li>
                Currency symbol: <b>ETH</b>
              </li>
            </ul>
          </Step>
          <Step>Save and switch to the new network.</Step>
          <Step>Return to BlockFund and click <b>Connect Wallet</b>.</Step>
        </ol>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">2) Get test ETH (for testing)</h2>
        <p className="mt-1 text-sm text-white/60">
          This is a private Hardhat RPC (no public faucet). To test the app, request{" "}
          <b>10 test ETH</b> from the admin.
        </p>

        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <Step>
            In MetaMask, click your account name/address at the top to copy your wallet
            address (it starts with <b>0x…</b>).
          </Step>
          <Step>
            Paste your address below and click <b>Open request form</b>. The form will
            be pre-filled.
          </Step>
          <Step>
            Submit the form. The admin will send <b>10 test ETH</b> manually to your
            wallet.
          </Step>
          <Step>Wait a moment and confirm your balance in MetaMask (Assets tab).</Step>
        </ol>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-4">
            <div className="text-xs text-white/50">Your name / tester ID</div>
            <input
              value={testerName}
              onChange={(event) => setTesterName(event.target.value)}
              placeholder="e.g., John / Tester-01"
              className="w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/35"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:col-span-8">
            <div className="text-xs text-white/50">
              Your MetaMask wallet address (0x...)
            </div>
            <input
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="0x1234... (copy from MetaMask)"
              className="w-full bg-transparent font-mono text-sm text-white/80 outline-none placeholder:text-white/35"
            />
            {walletAddress && !isAddress(walletAddress) ? (
              <div className="mt-1 text-xs text-red-300">
                Please paste a valid address (0x + 40 hex chars).
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(walletAddress.trim(), "addr")}
            disabled={!walletAddress.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            {copied === "addr" ? "Copied!" : "Copy address"}
          </button>

          <a
            href={requestUrl}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${requestButtonClass}`}
          >
            <ExternalLink className="h-4 w-4" />
            Open request form
          </a>
        </div>

        <p className="mt-3 text-xs text-white/45">
          ⚠️ Never share seed phrases or private keys. Only share your public wallet
          address (0x…).
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">3) Create your first campaign</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <Step>Go to the <b>Create</b> page.</Step>
          <Step>Fill title and description.</Step>
          <Step>Add media URL (image or video) and a project link (GitHub/website).</Step>
          <Step>Set goal (ETH) and duration (days).</Step>
          <Step>Submit and confirm the transaction in MetaMask.</Step>
          <Step>
            Your campaign will appear publicly when approved (if approval is enabled).
          </Step>
        </ol>

        <div className="mt-4">
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-sm transition hover:bg-purple-500/15"
          >
            Go to Create page
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/6 to-black/25 p-6">
        <h2 className="text-lg font-semibold">4) Donate to a campaign</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <Step>
            Open a campaign card (Explore/Campaigns) or open the campaign detail page.
          </Step>
          <Step>Enter amount in ETH.</Step>
          <Step>
            Click <b>Contribute</b> and confirm in MetaMask.
          </Step>
          <Step>After confirmation, the raised amount updates automatically.</Step>
        </ol>

        <div className="mt-4">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-sm transition hover:bg-purple-500/15"
          >
            Go to Explore page
          </Link>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-green-500/20 bg-gradient-to-b from-green-500/10 to-black/25 p-6">
        <h2 className="text-lg font-semibold">5) Final step: evaluate the website</h2>
        <p className="mt-2 text-sm text-white/70">
          You have completed the website evaluation flow. Now please fill in the
          final feedback form.
        </p>

        <div className="mt-4">
          <a
            href={finalEvaluationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm transition hover:bg-green-500/15"
          >
            <ExternalLink className="h-4 w-4" />
            Open evaluation form
          </a>
        </div>
      </div>
    </div>
  );
}