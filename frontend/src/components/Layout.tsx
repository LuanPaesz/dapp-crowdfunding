import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Search } from "lucide-react";
import type { FormEvent } from "react";

export default function Layout() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get("q") ?? "";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B12]/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link to="/" className="font-bold tracking-tight text-xl">
            <span className="text-[#8B5CF6]">Block</span>
            <span className="text-[#06B6D4]">Fund</span>
          </Link>

          <nav className="ml-6 hidden md:flex gap-4">
            {[
              { to: "/create", label: "Create a Campaign" },
              { to: "/explore", label: "Explorer" },
              { to: "/my", label: "My Contributions" },
              { to: "/settings", label: "Settings" },
            ].map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                className={({ isActive }) =>
                  `px-3 py-1 rounded-xl ${isActive ? "bg-white/10 text-white" : "text-white/70 hover:text-white"}`
                }
              >
                {i.label}
              </NavLink>
            ))}
          </nav>

          <form onSubmit={onSearch} className="ml-auto hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-white/60" />
              <input
                name="q"
                placeholder="Search by title or owner…"
                className="bg-transparent outline-none placeholder:text-white/40 w-64"
                value={q}
                onChange={(e) => setParams({ q: e.target.value })}
              />
            </div>
            <button className="btn bg-[#8B5CF6] hover:bg-[#7C3AED] border-transparent">Search</button>
          </form>

          <div className="ml-2">
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="py-8 text-center text-white/50">
        This is thing in the future with blockchain — Web3 + React + Hardhat
      </footer>
    </div>
  );
}
