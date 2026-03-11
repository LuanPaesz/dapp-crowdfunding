import { useMemo, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { Copy, ShieldCheck, Trash2, Zap } from "lucide-react";

type PurpleCardProps = Readonly<{
  title: string;
  icon: ReactNode;
  children: ReactNode;
}>;

function truncate(address?: string) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function clearLocalCache() {
  localStorage.clear();
  sessionStorage.clear();
  globalThis.location.reload();
}

function PurpleCard({ title, icon, children }: PurpleCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/15 via-white/6 to-black/25 p-5">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-purple-200">{icon}</span>
          {title}
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { address, chain, isConnected } = useAccount();
  const [copied, setCopied] = useState<string | null>(null);

  const rpcUrl = String(import.meta.env.VITE_RPC_URL ?? "");

  const safeRpc = useMemo(() => {
    if (!rpcUrl) {
      return "";
    }

    try {
      const parsedUrl = new URL(
        rpcUrl.startsWith("http") ? rpcUrl : `https://${rpcUrl}`
      );
      return parsedUrl.host;
    } catch {
      return rpcUrl;
    }
  }, [rpcUrl]);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);

      globalThis.setTimeout(() => {
        setCopied(null);
      }, 1200);
    } catch {
      // ignore clipboard failure
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-purple-500/12 via-white/6 to-black/25 p-6">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-purple-500/22 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-white/60">
          Basic preferences and quick actions for testers.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PurpleCard title="Connection" icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="space-y-2 text-sm text-white/70">
            <div>
              Status:{" "}
              {isConnected ? (
                <span className="text-green-300">Connected</span>
              ) : (
                <span className="text-yellow-300">Not connected</span>
              )}
            </div>

            <div>
              Wallet: <span className="text-white/80">{truncate(address)}</span>
            </div>

            <div>
              Network: <span className="text-white/80">{chain?.name ?? "Unknown"}</span>
              {chain?.id ? (
                <span className="text-white/50"> (Chain ID {chain.id})</span>
              ) : null}
            </div>
          </div>
        </PurpleCard>

        <PurpleCard title="RPC helper" icon={<Zap className="h-4 w-4" />}>
          <div className="space-y-3 text-sm text-white/70">
            <div>
              RPC host:{" "}
              <span className="text-white/85">{safeRpc || "Not configured"}</span>
            </div>

            {rpcUrl ? (
              <button
                type="button"
                onClick={() => copy(rpcUrl, "rpc")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                {copied === "rpc" ? "Copied!" : "Copy RPC URL"}
              </button>
            ) : (
              <div className="text-xs text-white/45">
                Add <span className="text-white/70">VITE_RPC_URL</span> to enable copy.
              </div>
            )}
          </div>
        </PurpleCard>

        <PurpleCard title="Maintenance" icon={<Trash2 className="h-4 w-4" />}>
          <div className="space-y-3 text-sm text-white/70">
            <div className="text-sm text-white/60">
              If the UI shows stale data, you can clear local cache and reload.
            </div>

            <button
              type="button"
              onClick={clearLocalCache}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear cache & reload
            </button>
          </div>
        </PurpleCard>
      </div>

      <div className="text-xs text-white/45">
        Note: Contract/admin addresses are intentionally not displayed in the public UI.
      </div>
    </div>
  );
}