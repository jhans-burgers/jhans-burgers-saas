import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import PublicStorePage from "./pages/PublicStorePage";
import AdminPanelPage from "./pages/AdminPanelPage";
import MasterAdminPage from "./pages/MasterAdminPage";
import DriverInstallPage from "./pages/DriverInstallPage";
import DriverAppPage from "./pages/DriverAppPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/painel" replace />} />
        <Route path="/loja/:slug" element={<PublicStorePage />} />
        <Route path="/painel/*" element={<AdminPanelPage />} />
        <Route path="/master" element={<MasterAdminPage />} />
        <Route path="/driver-install" element={<DriverInstallPage />} />
        <Route path="/motoboy" element={<DriverAppPage />} />
        <Route path="*" element={<div style={{ padding: 16, color: "white" }}>404</div>} />
      </Routes>
    </Router>
  );
}
