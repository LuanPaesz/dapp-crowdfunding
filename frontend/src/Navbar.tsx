import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { CROWDFUND_ABI, CROWDFUND_ADDRESS } from "./lib/contract";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import Logo from "./assets/BlockFundLogo.svg";

export default function Navbar() {
  const { address } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  // Admin from .env
  const envAdmin = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase() ?? null;

  // Admin from contract
  const { data: contractAdmin } = useReadContract({
    address: CROWDFUND_ADDRESS,
    abi: CROWDFUND_ABI,
    functionName: "admin",
  }) as { data?: string };

  const lowerAddr = address?.toLowerCase();
  const onChainAdmin = contractAdmin?.toLowerCase();

  const isAdmin =
    !!lowerAddr &&
    (lowerAddr === envAdmin ||
      (onChainAdmin && lowerAddr === onChainAdmin));

  const items = [
    { to: "/create", label: "Create" },
    { to: "/explore", label: "Explore" },
    { to: "/mycontributions", label: "Contributions" },
    { to: "/mycampaigns", label: "My Campaigns" },
    { to: "/audit", label: "Audit" },
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  // ---- Search state (navbar) ----
  const [q, setQ] = useState("");

  // Mantém o input sincronizado com a URL
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    setQ(sp.get("q") ?? "");
  }, [location.search]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = q.trim();
    navigate(value ? `/explore?q=${encodeURIComponent(value)}` : "/explore");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(11,12,16,.75)] backdrop-blur">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* LOGO */}
        <Link
          to="/explore"
          className="flex items-center -ml-3 -mt-1 shrink-0"
        >
          <img
            src={Logo}
            alt="BlockFund"
            className="h-11 w-auto drop-shadow-[0_0_12px_rgba(139,92,246,0.7)]"
          />
        </Link>

        {/* MENU */}
        <ul className="hidden md:flex items-center gap-2">
          {items.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                className={({ isActive }) =>
                  [
                    "px-3 py-1.5 rounded-xl text-sm transition whitespace-nowrap",

                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/5",
                  ].join(" ")
                }
              >
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* SEARCH (navbar, compacta, profissional) */}
        <form
          onSubmit={submitSearch}
          className="ml-auto hidden lg:flex items-center"
        >
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 w-[220px]">
            <Search className="w-4 h-4 text-white/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full bg-transparent outline-none placeholder:text-white/40 text-sm"
            />
          </div>
        </form>

        {/* WALLET */}
        <div className="shrink-0">
          <ConnectButton showBalance />
        </div>
      </nav>
    </header>
  );
}
