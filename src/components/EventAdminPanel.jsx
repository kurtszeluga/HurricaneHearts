import { useState } from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function EventAdminPanel({ user, activeEvent }) {
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(todayString());

  if (user.role !== "admin") return null;

  const activateEvent = async () => {
    if (!eventName.trim()) {
      alert("Please enter an event name.");
      return;
    }

    const confirmed = window.confirm(
      `Activate event '${eventName.trim()}' dated ${eventDate}? This will open the request module for this event.`
    );

    if (!confirmed) return;

    const eventId = `${eventDate}-${eventName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

    await setDoc(doc(db, "system", "activeEvent"), {
      active: true,
      eventId,
      eventName: eventName.trim(),
      eventDate,
      activatedAt: serverTimestamp(),
      activatedByUid: user.uid,
      activatedByName: user.name || user.email || "Admin"
    });

    await addDoc(collection(db, "eventHistory"), {
      eventId,
      eventName: eventName.trim(),
      eventDate,
      action: "activated",
      details: "Event was activated and the request module was opened.",
      byUid: user.uid,
      byName: user.name || user.email || "Admin",
      createdAt: serverTimestamp()
    });

    setEventName("");
  };

  const deactivateEvent = async () => {
    if (!activeEvent) return;

    const confirmed = window.confirm(
      `Deactivate '${activeEvent.eventName}'? This will close the request module. Existing requests remain stored under this event.`
    );

    if (!confirmed) return;

    await updateDoc(doc(db, "system", "activeEvent"), {
      active: false,
      deactivatedAt: serverTimestamp(),
      deactivatedByUid: user.uid,
      deactivatedByName: user.name || user.email || "Admin"
    });

    await addDoc(collection(db, "eventHistory"), {
      eventId: activeEvent.eventId,
      eventName: activeEvent.eventName,
      eventDate: activeEvent.eventDate,
      action: "deactivated",
      details: "Event was deactivated and the request module was closed.",
      byUid: user.uid,
      byName: user.name || user.email || "Admin",
      createdAt: serverTimestamp()
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 mb-8 border-l-4 border-red-600">
      <h2 className="text-2xl font-bold mb-2">Event Control</h2>
      <p className="text-sm text-gray-500 mb-5">
        Activate an event to open the request and claim module. Deactivate the event when the event is over.
      </p>

      {activeEvent ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="text-sm text-green-700 font-semibold mb-1">Current Active Event</div>
          <div className="text-2xl font-bold text-green-900">{activeEvent.eventName}</div>
          <div className="text-green-800 mb-4">Date: {activeEvent.eventDate}</div>

          <button
            onClick={deactivateEvent}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-semibold"
          >
            Deactivate Event
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event name, such as Hurricane Milton"
            className="border rounded-2xl px-4 py-3 bg-white md:col-span-2"
          />

          <input
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            type="date"
            className="border rounded-2xl px-4 py-3 bg-white"
          />

          <button
            onClick={activateEvent}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-semibold md:col-span-3"
          >
            Activate Event
          </button>
        </div>
      )}
    </div>
  );
}