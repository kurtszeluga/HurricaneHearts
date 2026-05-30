import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import WeatherTicker from "./WeatherTicker";

function formatEventDateTime(value) {
  if (!value) return "";

  if (value.toDate) {
    return value.toDate().toLocaleString();
  }

  if (typeof value === "string") {
    return new Date(value).toLocaleString();
  }

  return "";
}

export default function Navbar({ user, activeEvent, onEditProfile }) {
  return (
    <header className="bg-white text-[#172033] border-b border-[#d8e0ea] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img
              src="/hurricane-hearts-logo.jpg"
              alt="Hurricane Hearts logo"
              className="w-11 h-11 sm:w-14 sm:h-14 object-contain shrink-0 rounded-lg bg-white border border-[#d8e0ea] p-1"
            />

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#172033] leading-tight">
                Hurricane He<span className="text-[#b42318]">AR</span>ts
              </h1>
              <p className="text-xs sm:text-sm text-[#667085] font-semibold uppercase">
                Arlington Ridge Community
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4">
            <div className="text-left md:text-right">
              <div className="font-semibold text-[#172033] text-sm">
                User: <span className="font-normal text-[#475467]">{user.name || user.email}</span>
              </div>
              <div className="text-xs text-[#667085] capitalize">
                {user.role || "resident"}
              </div>
            </div>

            <button
              onClick={onEditProfile}
              className="bg-[#f8fafc] hover:bg-[#eef2f6] border border-[#d8e0ea] text-[#475467] px-3 py-2 rounded-md font-semibold text-sm shrink-0"
            >
              Edit Profile
            </button>

            <button
              onClick={() => signOut(auth)}
              className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-3 py-2 rounded-md font-semibold text-sm shrink-0"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
        {activeEvent ? (
          <div className="bg-[#fff7ed] border border-[#fed7aa] text-[#7c2d12] rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold grid gap-2 grid-cols-1 md:grid-cols-[1.2fr_1fr_1.2fr_auto] md:items-center">
            <span>ACTIVE EVENT: {activeEvent.eventName}</span>
            <span>Event Date: {activeEvent.eventDate || "Not provided"}</span>
            <span>Activated: {formatEventDateTime(activeEvent.activatedAt) || "Not recorded"}</span>
            <span className="text-[#16803c]">Status: Active</span>
          </div>
        ) : (
          <div className="bg-[#f8fafc] border border-[#d8e0ea] text-[#475467] rounded-lg px-4 py-2 text-sm font-semibold">
            No active event. Request assistance is currently disabled.
          </div>
        )}
      </div>
      <WeatherTicker enabled={true} />
    </header>
  );
}
