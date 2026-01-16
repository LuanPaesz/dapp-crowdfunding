import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Navbar";

import Create from "./pages/Create";
import Explore from "./pages/Explore";
import MyContributions from "./pages/MyContributions";
import MyCampaigns from "./pages/MyCampaigns";
import Settings from "./pages/Settings";
import CampaignEdit from "./pages/CampaignEdit";
import CampaignDetail from "./pages/CampaignDetail";
import Admin from "./pages/Admin";
import Audit from "./pages/Audit";
import AdminFinance from "./pages/AdminFinance";


export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">

        <Routes>
          {/* Redirect root → explore */}
          <Route path="/" element={<Navigate to="/explore" replace />} />

          {/* Public routes */}
          <Route path="/create" element={<Create />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/mycontributions" element={<MyContributions />} />
          <Route path="/mycampaigns" element={<MyCampaigns />} />
          <Route path="/settings" element={<Settings />} />

          {/* Campaign detail + edit */}
          <Route path="/campaign/:id" element={<CampaignDetail />} />
          <Route path="/campaign/:id/edit" element={<CampaignEdit />} />

          {/* Admin only */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/finance" element={<AdminFinance />} />

          
          <Route path="/audit" element={<Audit />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>

      </main>
    </div>
  );
}
