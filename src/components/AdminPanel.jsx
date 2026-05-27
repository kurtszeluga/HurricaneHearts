import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function adminName(user) {
  return user.name || user.email || "Admin";
}

function isOpenOrUncompletedRequest(request) {
  return request.status !== "Completed" && request.status !== "Cancelled";
}

export default function EventAdminPanel({ user, activeEvent, requests = [] }) {
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(todayString());

  if (user.role !== "admin") return null;

  const activateEvent = async () => {
    if (!eventName.trim()) {
      alert("Please enter an event name.");
      return;
    }

    const confirmed = window.confirm(
      `Activate event '${eventName.trim()}' dated ${eventDate}?`
    );

    if (!confirmed) return;

    const cleanEventName = eventName.trim();

    const eventId = `${eventDate}-${cleanEventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;

    const activatedByName = adminName(user);

    await setDoc(doc(db, "system", "activeEvent"), {
      active: true,
      eventId,
      eventName: cleanEventName,
      eventDate,
      activatedAt: serverTimestamp(),
      activatedByUid: user.uid,
      activatedByName,
      reopenedAt: null,
      reopenedByUid: null,
      reopenedByName: null,
      deactivatedAt: null,
      deactivatedByUid: null,
      deactivatedByName: null
    });

    await addDoc(collection(db, "eventHistory"), {
      eventId,
      eventName: cleanEventName,
      eventDate,
      action: "activated",
      details: "Event was activated and request module opened.",
      byUid: user.uid,
      byName: activatedByName,
      activatedAt: serverTimestamp(),
      activatedByUid: user.uid,
      activatedByName,
      createdAt: serverTimestamp()
    });

    setEventName("");
  };

  const deactivateEvent = async () => {
    if (!activeEvent) return;

    const activeEventRequests = requests.filter((request) => {
      return (
        request.eventId === activeEvent.eventId &&
        isOpenOrUncompletedRequest(request)
      );
    });

    let confirmMessage = `Deactivate '${activeEvent.eventName}'?`;

    if (activeEventRequests.length > 0) {
      confirmMessage = `WARNING:

${activeEventRequests.length} open or incomplete requests still exist.

Deactivate '${activeEvent.eventName}' anyway?`;
    }

    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) return;

    const deactivatedByName = adminName(user);

    await updateDoc(doc(db, "system", "activeEvent"), {
      active: false,
      deactivatedAt: serverTimestamp(),
      deactivatedByUid: user.uid,
      deactivatedByName
    });

    await addDoc(collection(db, "eventHistory"), {
      eventId: activeEvent.eventId,
      eventName: activeEvent.eventName,
      eventDate: activeEvent.eventDate,
      action: "deactivated",
      details:
        activeEventRequests.length > 0
          ? `Event deactivated with ${activeEventRequests.length} open request(s).`
          : "Event deactivated.",
      openOrUncompletedRequestCount: activeEventRequests.length,
      byUid: user.uid,
      byName: deactivatedByName,
      deactivatedAt: serverTimestamp(),
      deactivatedByUid: user.uid,
      deactivatedByName,
      createdAt: serverTimestamp()
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-3 mb-4 border-l-4 border-red-600">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-lg font-bold leading-tight">Event Control</h2>
          <p className="text-[11px] text-gray-500 leading-tight">
            Control the active disaster event
          </p>
        </div>

        {activeEvent && (
          <button
            type="button"
            onClick={deactivateEvent}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap"
          >
            Deactivate Event
          </button>
        )}
      </div>

      {activeEvent ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wide text-green-700 font-semibold leading-tight">
            Active Event
          </div>

          <div className="text-base font-bold text-green-900 leading-tight">
            {activeEvent.eventName}
          </div>

          <div className="text-xs text-green-800 leading-tight">
            {activeEvent.eventDate}
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-end md:justify-center gap-2">
          <div className="w-full md:w-[360px]">
            <label className="block text-[10px] text-gray-500 mb-0.5 text-center">
              Event Name
            </label>

            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Hurricane Milton"
              className="border rounded-lg px-3 py-1.5 bg-white w-full text-sm text-center"
            />
          </div>

          <div className="w-full md:w-[170px]">
            <label className="block text-[10px] text-gray-500 mb-0.5 text-center">
              Event Date
            </label>

            <input
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              type="date"
              className="border rounded-lg px-3 py-1.5 bg-white w-full text-sm text-center"
            />
          </div>

          <button
            type="button"
            onClick={activateEvent}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-semibold text-sm h-[34px] whitespace-nowrap"
          >
            Activate
          </button>
        </div>
      )}
    </div>
  );
}