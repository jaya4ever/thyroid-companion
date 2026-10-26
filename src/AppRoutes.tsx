import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import DashboardPage from "./features/dashboard/DashboardPage.jsx";
import LabResultsPage from "./features/labs/LabResultsPage";
import MedicationsPage from "./features/medications/MedicationsPage";
import ProfilePage from "./features/profile/ProfilePage.jsx";
import SymptomsPage from "./features/symptoms/SymptomsPage";
import TrendsPage from "./features/trends/TrendsPage";
import SectionPage from "./pages/SectionPage.jsx";

function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/labs" element={<LabResultsPage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/symptoms" element={<SymptomsPage />} />
        <Route path="/journal" element={<SectionPage section="journal" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default AppRoutes;
