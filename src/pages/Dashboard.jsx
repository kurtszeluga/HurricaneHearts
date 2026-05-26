import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
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
  const [activePage, setActivePage] = useState("Home");
  const [requestFilter, setRequestFilter] = useState({ type: "status", value: "Open" });
  const [openModal, setOpenModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const adminPages = ["Admin", "Reports"];
  const visiblePages = pageOptions.filter((page) => {
    if (adminPages.includes(page)) return user.role === "admin";
    return true;
  });

  const goToPage = (page) => {
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
        profileComplete: true
      };

      await updateDoc(doc(db, "users", user.uid), updatedProfile);

      setUser({
        ...user,
        ...updatedProfile
      });

      alert("Profile saved.");
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
          title="Edit My Profile"
          user={user}
          onSave={saveMyProfile}
          onCancel={() => setActivePage("Home")}
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

    if (activePage === "History") {
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

    if (activePage === "Notifications") {
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
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} activeEvent={activeEvent} onEditProfile={openProfilePage} />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="bg-white border rounded-2xl shadow-sm p-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                {pageLabels[activePage]}
              </h2>
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                  Menu:
                </span>

                <div className="relative w-full sm:w-56">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="w-full bg-gray-50 hover:bg-gray-100 border rounded-xl px-4 py-2.5 flex items-center justify-between font-semibold text-gray-800"
                  >
                    <span className="flex items-center gap-2">
                      <span>{pageIcons[activePage]}</span>
                      <span>{pageLabels[activePage]}</span>
                    </span>
                    <span className="text-xs text-gray-500">{menuOpen ? "▲" : "▼"}</span>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 left-0 sm:left-auto sm:w-56 mt-2 bg-white border rounded-2xl shadow-xl p-2 z-40">
                      {visiblePages.map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={
                            activePage === page
                              ? "w-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2.5 rounded-xl font-semibold text-left flex items-center gap-2 text-sm"
                              : "w-full hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-xl font-semibold text-left flex items-center gap-2 text-sm"
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

              <p className="text-xs text-gray-500 sm:pl-14">
                Use the menu to move between Hurricane Hearts pages.
              </p>
            </div>
          </div>
        </div>

        <main className="mx-auto w-full">
          {renderPage()}
        </main>
      </div>

      <footer className="text-center text-xs text-gray-500 py-4">
        © 2026 Hurricane Hearts — Arlington Ridge v.1 TEST 
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