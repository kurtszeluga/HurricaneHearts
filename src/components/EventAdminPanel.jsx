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
import { queueEventActivatedBlastEmail } from "../utils/emailNotifications";

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

    const sendBlast = window.confirm(
      `Send a blast email to all active users announcing '${cleanEventName}'?`
    );

    if (sendBlast) {
      await queueEventActivatedBlastEmail(db, {
        eventId,
        eventName: cleanEventName,
        eventDate
      }).catch((error) => {
        console.error("Event activation blast email error:", error);
        alert(error.message || "Unable to send event activation blast email.");
      });
    }

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
    <div className="bg-[#ecfdf3] text-[#064e3b] border border-[#abefc6] rounded-lg shadow-sm p-3 mb-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
        <div className="flex items-center gap-3 pl-8">
          {activeEvent && (
            <button
              type="button"
              onClick={deactivateEvent}
              className="bg-[#b42318] text-white hover:bg-[#9f1f16] px-3 py-1 rounded-md font-semibold text-xs whitespace-nowrap"
            >
              Deactivate Event
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-0 min-w-0">
          <h2 className="text-sm font-bold leading-tight">Event Control</h2>
          <p className="text-[11px] opacity-90 leading-tight mt-0">Manage the current event</p>
        </div>

        {activeEvent && (
          <div className="flex flex-col items-center min-w-0">
            <div className="text-sm font-semibold truncate text-center">{activeEvent.eventName}</div>
            <div className="text-[11px] opacity-90 truncate text-center">{activeEvent.eventDate}</div>
          </div>
        )}

        {!activeEvent && (
          <div className="flex items-center justify-end gap-3">
            <>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Event name"
                className="px-2 py-1 rounded-md text-sm w-40 bg-white border border-[#abefc6] text-[#172033]"
              />

              <input
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                type="date"
                className="px-2 py-1 rounded-md text-sm w-36 bg-white border border-[#abefc6] text-[#172033]"
              />

              <button
                type="button"
                onClick={activateEvent}
                className="bg-[#16803c] hover:bg-[#126b32] text-white px-3 py-1 rounded-md font-semibold text-sm"
              >
                Activate
              </button>
            </>
          </div>
        )}
      </div>
    </div>
  );
}
