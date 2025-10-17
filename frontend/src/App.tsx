import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Create from "./pages/Create";
import Explore from "./pages/Explore";
import MyContributions from "./pages/MyContributions";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* rota padrão redireciona para Explorar */}
        <Route index element={<Navigate to="/explore" replace />} />
        <Route path="/create" element={<Create />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/my" element={<MyContributions />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
