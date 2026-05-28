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
  const [menuOpen, setMenuOpen] = useState(false);

  const adminPages = ["Admin", "History", "Notifications", "Reports"];
  const visiblePages = pageOptions.filter((page) => {
    if (adminPages.includes(page)) return user.role === "admin";
    return true;
  });

  const goToPage = (page) => {
    if (requiresFirstLoginProfile && page !== "Profile") {
      setActivePage("Profile");
      setShowFirstLoginSplash(true);
      setMenuOpen(false);
      return;
    }

    setActivePage(page);
    setMenuOpen(false);
  };

  const openProfilePage = () => {
    setActivePage("Profile");
    setMenuOpen(false);
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
    setMenuOpen(false);
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
      return <NotificationsPage notifications={notifications} />;
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
    <div className="min-h-screen bg-[#e8edf3]">
      <Navbar user={user} activeEvent={activeEvent} onEditProfile={openProfilePage} />

      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-3 sm:py-4">
        {showFirstLoginSplash && (
          <div className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] rounded-lg p-4 mb-3 text-center shadow-sm">
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
              className="mt-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Continue
            </button>
          </div>
        )}

        <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-md px-3 py-2 mb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 flex justify-center">
              <h2 className="text-lg sm:text-xl font-bold text-[#172033] leading-tight text-center underline underline-offset-4 decoration-[#b42318]">
                {pageLabels[activePage]}
              </h2>
            </div>

            <div className="flex-none w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#667085] whitespace-nowrap">Menu:</span>
                <div className="relative w-40">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#c7d0dc] rounded-md px-3 py-1.5 flex items-center justify-between font-semibold text-[#172033] text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{pageIcons[activePage]}</span>
                      <span className="hidden sm:inline">{pageLabels[activePage]}</span>
                    </span>
                    <span className="text-xs text-[#667085]">{menuOpen ? "▲" : "▼"}</span>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 sm:left-auto sm:w-40 mt-2 bg-white border border-[#c7d0dc] rounded-lg shadow-xl p-1 z-40 text-xs">
                      {visiblePages.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={
                            activePage === page
                              ? "w-full bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] px-3 py-1.5 rounded-md font-semibold text-left flex items-center gap-2 text-xs underline underline-offset-2"
                              : "w-full hover:bg-[#f1f5f9] text-[#475467] px-3 py-1.5 rounded-md font-semibold text-left flex items-center gap-2 text-xs underline underline-offset-2"
                          }
                        >
                          <span className="text-base w-5 text-center">{pageIcons[page]}</span>
                          <span>{pageLabels[page]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full">
          {renderPage()}
        </main>
      </div>

      <footer className="text-center text-xs text-[#667085] py-4">
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
