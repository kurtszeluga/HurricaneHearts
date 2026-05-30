import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { normalizePhoneNumber } from "../utils/formatPhoneNumber";
import Navbar from "../components/Navbar";
import RequestModal from "../components/RequestModal";
import ProfileEditor from "../components/ProfileEditor";
import HomePage from "./HomePage";
import RequestsPage from "./RequestsPage";
import DirectoryPage from "./DirectoryPage";
import DocumentsPage from "./DocumentsPage";
import HistoryPage from "./HistoryPage";
import AdminPage from "./AdminPage";
import ReportsPage from "./ReportsPage";
import NotificationsPage from "./NotificationsPage";

const pageOptions = [
  "Home",
  "Requests",
  "Directory",
  "Documents",
  "History",
  "Notifications",
  "Admin",
  "Reports"
];


const pageLabels = {
  Home: "Dashboard",
  Requests: "Requests",
  Directory: "Directory",
  Documents: "Documents",
  History: "History",
  Notifications: "Notifications",
  Admin: "Admin Panel",
  Reports: "Reports",
  Profile: "Edit Profile"
};

const pageIcons = {
  Home: "⌂",
  Requests: "+",
  Directory: "👥",
  Documents: "📄",
  History: "◷",
  Notifications: "🔔",
  Admin: "🛡",
  Reports: "▦",
  Profile: "👤"
};

export default function Dashboard({
  user,
  setUser,
  activeEvent,
  requests,
  users,
  documents = [],
  requestHistory = [],
  eventHistory = [],
  notifications = []
}) {
  const requiresFirstLoginProfile =
    user.firstLoginProfileRequired === true;

  const [activePage, setActivePage] = useState(() =>
    requiresFirstLoginProfile
      ? "Profile"
      : user.role === "admin"
        ? "Admin"
        : "Home"
  );
  const [showFirstLoginSplash, setShowFirstLoginSplash] =
    useState(requiresFirstLoginProfile);
  const [requestFilter, setRequestFilter] = useState(() =>
    user.role === "admin"
      ? { type: "status", value: "Open" }
      : { type: "status", value: "All" }
  );
  const [openModal, setOpenModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const adminPages = ["Admin", "History", "Notifications", "Reports"];
  const visiblePages = pageOptions.filter((page) => {
    if (adminPages.includes(page)) return user.role === "admin";
    return true;
  });
  const navigationPages =
    activePage === "Profile"
      ? ["Profile", ...visiblePages]
      : visiblePages;

  const goToPage = (page) => {
    if (requiresFirstLoginProfile && page !== "Profile") {
      setActivePage("Profile");
      setShowFirstLoginSplash(true);
      return;
    }

    setActivePage(page);
  };

  const openProfilePage = () => {
    setActivePage("Profile");
  };

  const saveMyProfile = async (updatedUser) => {
    try {
      const serviceCategories = Array.isArray(updatedUser.serviceCategories)
        ? updatedUser.serviceCategories
        : [];

      const updatedProfile = {
        name: updatedUser.name,
        email: updatedUser.email,
        address: updatedUser.address,
        phone: normalizePhoneNumber(updatedUser.phone),
        serviceCategories,
        profileComplete: true,
        firstLoginProfileRequired: false,
        firstLoginProfileCompletedAt:
          requiresFirstLoginProfile
            ? serverTimestamp()
            : user.firstLoginProfileCompletedAt || null
      };

      await updateDoc(doc(db, "users", user.uid), updatedProfile);

      setUser({
        ...user,
        ...updatedProfile,
        firstLoginProfileCompletedAt:
          requiresFirstLoginProfile
            ? new Date().toISOString()
            : user.firstLoginProfileCompletedAt || null
      });

      alert("Profile saved.");
      setShowFirstLoginSplash(false);
      setActivePage("Home");
    } catch (error) {
      console.error("Profile save error:", error);
      alert("Profile could not be saved. Please check the browser console for the Firebase error.");
    }
  };

  const openRequestsWithFilter = (filter = "Open") => {
    if (typeof filter === "string") {
      setRequestFilter({ type: "status", value: filter });
    } else {
      setRequestFilter(filter);
    }

    setActivePage("Requests");
  };

  const openNewRequest = () => {
    if (!activeEvent) {
      alert("Requests can only be submitted while an event is active.");
      openRequestsWithFilter("Open");
      return;
    }

    setEditingRequest(null);
    setOpenModal(true);
    openRequestsWithFilter("Open");
  };

  const openEditRequest = (request) => {
    setEditingRequest(request);
    setOpenModal(true);
  };

  const renderPage = () => {
    if (activePage === "Profile") {
      return (
        <ProfileEditor
          title={
            requiresFirstLoginProfile
              ? "Review My Profile"
              : "Edit My Profile"
          }
          user={user}
          onSave={saveMyProfile}
          onCancel={
            requiresFirstLoginProfile
              ? null
              : () => setActivePage("Home")
          }
        />
      );
    }

    if (activePage === "Home") {
      return (
        <HomePage
          user={user}
          requests={requests}
          activeEvent={activeEvent}
          onNewRequest={openNewRequest}
          onGoToRequests={openRequestsWithFilter}
          onGoToDirectory={() => goToPage("Directory")}
        />
      );
    }

    if (activePage === "Requests") {
      return (
        <RequestsPage
          user={user}
          requests={requests}
          onNewRequest={openNewRequest}
          onEditRequest={openEditRequest}
          activeEvent={activeEvent}
          users={users}
          requestFilter={requestFilter}
          onRequestFilterChange={setRequestFilter}
        />
      );
    }

    if (activePage === "Directory") {
      return <DirectoryPage users={users} />;
    }

    if (activePage === "Documents") {
      return <DocumentsPage user={user} documents={documents} activeEvent={activeEvent} />;
    }

    if (activePage === "History" && user.role === "admin") {
      return (
        <HistoryPage
          user={user}
          requests={requests}
          requestHistory={requestHistory}
          eventHistory={eventHistory}
          activeEvent={activeEvent}
        />
      );
    }

    if (activePage === "Notifications" && user.role === "admin") {
      return <NotificationsPage user={user} notifications={notifications} />;
    }

    if (activePage === "Admin" && user.role === "admin") {
      return <AdminPage user={user} users={users} activeEvent={activeEvent} />;
    }

    if (activePage === "Reports" && user.role === "admin") {
      return (
        <ReportsPage
          user={user}
          users={users}
          requests={requests}
          requestHistory={requestHistory}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <Navbar user={user} activeEvent={activeEvent} onEditProfile={openProfilePage} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {showFirstLoginSplash && (
          <div className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] rounded-lg p-4 mb-4 text-center shadow-sm">
            <h2 className="text-lg font-bold">
              Welcome to Hurricane Hearts
            </h2>

            <p className="text-sm mt-1">
              Please review your contact information and select any
              categories you would be willing to volunteer for. If you do not
              want to volunteer right now, just confirm your contact
              information and save.
            </p>

            <button
              type="button"
              onClick={() => setShowFirstLoginSplash(false)}
              className="mt-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-md text-sm font-semibold"
            >
              Continue
            </button>
          </div>
        )}

        <div className="bg-white border border-[#d8e0ea] rounded-lg shadow-sm px-3 py-3 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="shrink-0">
              <p className="text-[11px] font-bold uppercase text-[#b42318]">Member Area</p>
              <h2 className="text-xl sm:text-2xl font-bold text-[#172033] leading-tight">
                {pageLabels[activePage]}
              </h2>
            </div>

            <nav className="hidden md:flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={
                    activePage === page
                      ? "shrink-0 bg-[#fff1f0] text-[#b42318] border border-[#fecdca] px-3 py-2 rounded-md font-semibold text-xs"
                      : "shrink-0 hover:bg-[#f8fafc] text-[#475467] border border-transparent px-3 py-2 rounded-md font-semibold text-xs"
                  }
                >
                  <span className="mr-1">{pageIcons[page]}</span>
                  {pageLabels[page]}
                </button>
              ))}
            </nav>

            <div className="md:hidden min-w-0 flex-1">
              <label className="sr-only" htmlFor="mobile-page-menu">
                Menu
              </label>
              <select
                id="mobile-page-menu"
                value={activePage}
                onChange={(event) => goToPage(event.target.value)}
                className="w-full bg-[#f8fafc] border border-[#c7d0dc] rounded-md px-3 py-2 text-sm font-semibold text-[#172033] focus:outline-none focus:ring-2 focus:ring-[#b42318]"
              >
                {navigationPages.map((page) => (
                  <option key={page} value={page}>
                    {pageLabels[page]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full">
          {renderPage()}
        </main>
      </div>

      <footer className="border-t border-[#d8e0ea] bg-white text-center text-xs text-[#667085] py-4">
        © 2026 Hurricane Hearts — Arlington Ridge Community v.1.0
      </footer>

      <RequestModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditingRequest(null);
        }}
        user={user}
        users={users}
        editingRequest={editingRequest}
        activeEvent={activeEvent}
      />
    </div>
  );
}
