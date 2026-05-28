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
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <img
              src="/hurricane-hearts-logo.jpg"
              alt="Hurricane Hearts logo"
              className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain shrink-0"
            />

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
                Hurricane He<span className="text-red-600">AR</span>ts
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600">
                Arlington Ridge Community
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4">
            <div className="text-left md:text-right">
              <div className="font-semibold text-gray-900 text-sm sm:text-base">
                User: <span className="font-normal">{user.name || user.email}</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-500 capitalize">
                {user.role || "resident"}
              </div>
            </div>

            <button
              onClick={onEditProfile}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-semibold text-sm sm:text-base shrink-0"
            >
              Edit Profile
            </button>

            <button
              onClick={() => signOut(auth)}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-semibold text-sm sm:text-base shrink-0"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        {activeEvent ? (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-2xl px-4 sm:px-5 py-3 text-sm font-semibold grid gap-2 grid-cols-1 md:grid-cols-[1.2fr_1fr_1.2fr_auto] md:items-center">
            <span>ACTIVE EVENT: {activeEvent.eventName}</span>
            <span>Event Date: {activeEvent.eventDate || "Not provided"}</span>
            <span>Activated: {formatEventDateTime(activeEvent.activatedAt) || "Not recorded"}</span>
            <span className="text-green-700">Status: Active</span>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl px-4 sm:px-5 py-3 text-sm font-semibold">
            No active event. Request assistance is currently disabled.
          </div>
        )}
      </div>
      <WeatherTicker enabled={true} />
    </header>
  );
}