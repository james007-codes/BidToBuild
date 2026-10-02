import React, { useState, useEffect } from "react";

import { COLORS } from "./styles/tokens.js";

import {
  getToken,
  getStoredUser,
  getRole,
  getCurrentUser,
  logout,
} from "./services/authService.js";

// =========================
// LAYOUT
// =========================

import { Sidebar } from "./components/layout/Sidebar.jsx";
import { Header } from "./components/layout/Header.jsx";

// =========================
// AUTH
// =========================

import { Login } from "./pages/Login.jsx";
import { Register } from "./pages/Register.jsx";

// =========================
// USER (students / faculty)
// =========================

import { UserDashboard } from "./pages/user/UserDashboard.jsx";
import { ReportIssue } from "./pages/user/ReportIssue.jsx";
import { MyComplaints } from "./pages/user/MyComplaints.jsx";
import { ComplaintTracker } from "./pages/user/ComplaintTracker.jsx";
import AIAssistant from "./pages/AIAssistant.jsx";

// =========================
// ADMIN (maintenance manager)
// =========================

import { AdminDashboard } from "./pages/admin/AdminDashboard.jsx";
import { Complaints } from "./pages/admin/Complaints.jsx";
import { ComplaintDetail } from "./pages/admin/ComplaintDetail.jsx";
import { Locations } from "./pages/admin/Locations.jsx";
import { Analytics } from "./pages/admin/Analytics.jsx";

export default function App() {
  // =========================
  // AUTH STATE
  // =========================

  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [authPage, setAuthPage] = useState("login");
  const [registerRole, setRegisterRole] = useState("user");

  // =========================
  // NAVIGATION STATE (no router — page is plain state)
  // =========================

  const [page, setPage] = useState("dashboard");
  const [complaintId, setComplaintId] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (next) => {
    setPage(next);
    setComplaintId(null);
    window.scrollTo({ top: 0 });
  };

  const openComplaint = (id) => {
    setComplaintId(id);
    setPage(role === "admin" ? "complaints" : "my-complaints");
    window.scrollTo({ top: 0 });
  };

  // =========================
  // RESTORE LOGIN
  // =========================

  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      const storedUser = getStoredUser();
      const storedRole = getRole();

      if (!token || !storedUser || !storedRole) {
        setCheckingAuth(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (currentUser) {
          const actualUser = currentUser.user || currentUser.admin || currentUser;
          setUser({ ...actualUser, role: storedRole });
          setRole(storedRole);
          setAuthed(true);
        } else {
          logout();
        }
      } catch (error) {
        console.error("Session restore failed:", error);
        logout();
      } finally {
        setCheckingAuth(false);
      }
    };

    restoreSession();
  }, []);

  // =========================
  // LOGIN / LOGOUT
  // =========================

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setRole(loggedInUser.role);
    setAuthed(true);
    navigate("dashboard");
  };

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setUser(null);
    setRole(null);
    navigate("dashboard");
    setAuthPage("login");
  };

  // =========================
  // AUTH LOADING
  // =========================

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.bg }}>
        <div className="text-sm" style={{ color: COLORS.slate }}>Checking your session...</div>
      </div>
    );
  }

  // =========================
  // NOT LOGGED IN
  // =========================

  if (!authed) {
    if (authPage === "register") {
      return <Register role={registerRole} onLogin={handleLogin} onBackToLogin={() => setAuthPage("login")} />;
    }

    return (
      <Login
        onLogin={handleLogin}
        onRegister={(selectedRole) => {
          setRegisterRole(selectedRole);
          setAuthPage("register");
        }}
      />
    );
  }

  // =========================
  // PAGES
  // =========================

  const userPages = () => {
    if (page === "my-complaints" && complaintId) {
      return <ComplaintTracker id={complaintId} onBack={() => setComplaintId(null)} />;
    }
    switch (page) {
      case "report":
        return <ReportIssue user={user} onOpenComplaint={openComplaint} onNavigate={navigate} />;
      case "my-complaints":
        return <MyComplaints onOpenComplaint={openComplaint} onNavigate={navigate} />;
      case "assistant":
        return <AIAssistant />;
      default:
        return <UserDashboard user={user} onNavigate={navigate} onOpenComplaint={openComplaint} />;
    }
  };

  const adminPages = () => {
    if (page === "complaints" && complaintId) {
      return <ComplaintDetail id={complaintId} onBack={() => setComplaintId(null)} />;
    }
    switch (page) {
      case "complaints":
        return <Complaints onSelect={openComplaint} />;
      case "locations":
        return <Locations onSelect={openComplaint} />;
      case "analytics":
        return <Analytics />;
      default:
        return <AdminDashboard onSelect={openComplaint} onNavigate={navigate} />;
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        role={role}
        user={user}
        page={page}
        setPage={navigate}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0">
        <Header setMobileOpen={setMobileOpen} user={user} role={role} />
        <main key={`${page}-${complaintId || ""}`} className="page-enter">{role === "admin" ? adminPages() : userPages()}</main>
      </div>
    </div>
  );
}
