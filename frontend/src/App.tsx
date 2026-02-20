import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Navbar";

import Create from "./pages/Create";
import Explore from "./pages/Explore";
import Campaigns from "./pages/Campaigns";
import MyContributions from "./pages/MyContributions";
import MyCampaigns from "./pages/MyCampaigns";
import Settings from "./pages/Settings";
import CampaignEdit from "./pages/CampaignEdit";
import CampaignDetail from "./pages/CampaignDetail";
import Admin from "./pages/Admin";
import Audit from "./pages/Audit";
import Tutorials from "./pages/Tutorials";
import Diagrams from "./pages/Diagrams";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/explore" replace />} />

          <Route path="/create" element={<Create />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/campaigns" element={<Campaigns />} />

          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/diagrams" element={<Diagrams />} />

          <Route path="/mycontributions" element={<MyContributions />} />
          <Route path="/mycampaigns" element={<MyCampaigns />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="/campaign/:id" element={<CampaignDetail />} />
          <Route path="/campaign/:id/edit" element={<CampaignEdit />} />

          <Route path="/admin" element={<Admin />} />
          <Route path="/audit" element={<Audit />} />

          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </main>
    </div>
  );
}