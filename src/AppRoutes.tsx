import { Component, lazy, Suspense } from "react";
import type { PropsWithChildren } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
const ActivityPage = lazy(() => import("./features/activity/ActivityPage"));
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage.jsx"));
const LabResultsPage = lazy(() => import("./features/labs/LabResultsPage"));
const MedicationsPage = lazy(() => import("./features/medications/MedicationsPage"));
const NutritionPage = lazy(() => import("./features/nutrition/NutritionPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage.jsx"));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage"));
const SymptomsPage = lazy(() => import("./features/symptoms/SymptomsPage"));
const TrendsPage = lazy(() => import("./features/trends/TrendsPage"));
import SectionPage from "./pages/SectionPage.jsx";

interface RouteErrorState {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<PropsWithChildren, RouteErrorState> {
  state: RouteErrorState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="inline-empty-state" role="alert">
          <p>This page could not be loaded.</p>
          <button className="secondary-action" type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteLoadingFallback() {
  return <div className="inline-empty-state" role="status">Loading page...</div>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AppShell>
      <RouteErrorBoundary key={location.pathname}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/nutrition" element={<NutritionPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/labs" element={<LabResultsPage />} />
            <Route path="/medications" element={<MedicationsPage />} />
            <Route path="/symptoms" element={<SymptomsPage />} />
            <Route path="/journal" element={<SectionPage section="journal" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </AppShell>
  );
}

export default AppRoutes;
