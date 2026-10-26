import { useState } from "react";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BookOpen,
  ChartNoAxesCombined,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Pill,
  Sprout,
  UserRound,
  X,
} from "lucide-react";
import { useHealthData } from "../context/useHealthData.js";

const navigation = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Trends", to: "/trends", icon: ChartNoAxesCombined },
  { label: "Lab results", to: "/labs", icon: FlaskConical },
  { label: "Medications", to: "/medications", icon: Pill },
  { label: "Symptoms", to: "/symptoms", icon: HeartPulse },
  { label: "Journal", to: "/journal", icon: BookOpen },
  { label: "My Profile", to: "/profile", icon: UserRound },
];

function Brand() {
  return (
    <NavLink className="brand" to="/" aria-label="Thyroid Companion overview">
      <span className="brand-mark" aria-hidden="true">
        <Sprout size={21} strokeWidth={1.8} />
      </span>
      <span>
        <span className="brand-name">thyroid companion</span>
        <span className="brand-caption">Your wellness, in view</span>
      </span>
    </NavLink>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main navigation">
      <p className="nav-label">Your space</p>
      <ul className="nav-list">
        {navigation.map(({ label, to, icon: Icon }) => (
          <li key={to}>
            <NavLink className="nav-link" to={to} end={to === "/"} onClick={onNavigate}>
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProfileSummary() {
  const { profile } = useHealthData();
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="profile-row">
      <span className="avatar" aria-hidden="true">
        {initials}
      </span>
      <span>
        <span className="profile-name">{profile.name}</span>
        <span className="profile-caption">Fictional demo profile</span>
      </span>
    </div>
  );
}

function AppShell({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Application sidebar">
        <Brand />
        <NavigationLinks />
        <div className="sidebar-bottom">
          <ProfileSummary />
        </div>
      </aside>

      <main className="app-main">
        <header className="mobile-header">
          <Brand />
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="mobile-menu" id="mobile-navigation" hidden={!menuOpen}>
            <NavigationLinks onNavigate={() => setMenuOpen(false)} />
          </div>
        </header>

        <div className="demo-notice" role="note">
          <Activity size={14} aria-hidden="true" />
          <span>Fictional demo data - No real medical information</span>
        </div>

        <div key={location.pathname} className="route-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppShell;
