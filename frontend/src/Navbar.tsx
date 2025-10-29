import { Link, NavLink, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  const location = useLocation();

  const items = [
    { to: "/create", label: "Create a Campaign" },
    { to: "/explore", label: "Explorer" },
    { to: "/mycontributions", label: "My Contributions" },
    { to: "/mycampaigns", label: "My Campaigns" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-gray-800">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/explore" className="text-2xl font-bold">
          <span className="text-purple-500">Block</span>Fund
        </Link>

        <ul className="flex items-center gap-8">
          {items.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                className={({ isActive }) =>
                  `text-sm transition ${
                    isActive || location.pathname === it.to
                      ? "text-purple-400 font-semibold"
                      : "text-gray-300 hover:text-white"
                  }`
                }
              >
                {it.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <ConnectButton showBalance />
      </nav>
    </header>
  );
}
