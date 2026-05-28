import { useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

function formatDateTime(value) {
  if (!value) return "Not recorded";

  let rawDate = null;

  if (typeof value?.toDate === "function") {
    rawDate = value.toDate();
  } else if (typeof value?.seconds === "number") {
    rawDate = new Date(value.seconds * 1000);
  } else {
    rawDate = new Date(value);
  }

  if (!rawDate || Number.isNaN(rawDate.getTime())) return "Not recorded";

  return rawDate.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") || null;
}

function normalizeAction(action = "") {
  return String(action).toLowerCase().trim();
}

function isActivationAction(action) {
  const normalized = normalizeAction(action);
  return normalized.includes("activat") && !normalized.includes("deactivat");
}

function isDeactivationAction(action) {
  const normalized = normalizeAction(action);
  return normalized.includes("deactivat") || normalized.includes("terminat") || normalized.includes("closed");
}

function isReopenAction(action) {
  const normalized = normalizeAction(action);
  return normalized.includes("reopen");
}

function getEventId(entry) {
  return firstValue(
    entry.eventId,
    entry.eventID,
    entry.event_id,
    entry.id,
    `${entry.eventName || entry.eventTitle || entry.name || "Event"}-${entry.eventDate || entry.date || ""}`
  );
}

function getEventName(entry) {
  return firstValue(entry.eventName, entry.eventTitle, entry.title, entry.name, "Event");
}

function getEventDate(entry) {
  return firstValue(entry.eventDate, entry.date, entry.eventDay, "");
}

function getActivationTime(entry) {
  return firstValue(
    entry.activatedAt,
    entry.reopenedAt,
    entry.activationAt,
    entry.activationDateTime,
    entry.dateTimeActivation,
    entry.createdAt,
    entry.timestamp
  );
}

function getDeactivationTime(entry) {
  return firstValue(
    entry.deactivatedAt,
    entry.terminatedAt,
    entry.terminationAt,
    entry.terminationDateTime,
    entry.dateTimeTermination,
    entry.createdAt,
    entry.timestamp
  );
}

function getActivatedBy(entry) {
  return firstValue(
    entry.activatedByName,
    entry.reopenedByName,
    entry.activatedBy,
    entry.byName,
    entry.byEmail,
    entry.createdByName,
    entry.createdBy,
    "Not recorded"
  );
}

function getDeactivatedBy(entry) {
  return firstValue(
    entry.deactivatedByName,
    entry.deactivatedBy,
    entry.terminatedByName,
    entry.terminatedBy,
    entry.byName,
    entry.byEmail,
    entry.createdByName,
    entry.createdBy,
    "Not recorded"
  );
}

function getRequestCreatedAt(request) {
  return firstValue(request.createdAt, request.requestedAt, request.submittedAt, request.timestamp);
}

function getSortSeconds(value) {
  if (!value) return 0;
  if (typeof value?.seconds === "number") return value.seconds;
  if (typeof value?.toDate === "function") return value.toDate().getTime() / 1000;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed / 1000;
}

function earlierTime(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return getSortSeconds(a) <= getSortSeconds(b) ? a : b;
}

function laterTime(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return getSortSeconds(a) >= getSortSeconds(b) ? a : b;
}

function displayActivationTime(event) {
  if (event.reopenedAt) return `${formatDateTime(event.reopenedAt)} (reopened)`;
  if (event.activatedAt) return formatDateTime(event.activatedAt);
  if (event.firstRequestAt) return `${formatDateTime(event.firstRequestAt)} (first request)`;
  return "Not recorded";
}

function displayDeactivationTime(event) {
  if (event.deactivatedAt) return formatDateTime(event.deactivatedAt);
  return "Not recorded";
}

function createEmptyEvent(eventId, eventName = "Event", eventDate = "") {
  return {
    eventId,
    eventName,
    eventDate,
    activatedAt: null,
    activatedByName: "Not recorded",
    deactivatedAt: null,
    deactivatedByName: "Not recorded",
    reopenedAt: null,
    reopenedByName: "Not recorded",
    firstRequestAt: null,
    lastRequestAt: null,
    source: "unknown"
  };
}

function canReopenEvent(event, activeEvent) {
  if (!event) return false;
  if (event.reopenedAt) return false;
  if (activeEvent?.eventId === event.eventId) return false;

  return (
    Boolean(event.deactivatedAt) ||
    event.deactivatedByName !== "Not recorded" ||
    event.source === "eventHistory" ||
    event.source === "requests"
  );
}

function adminName(user) {
  return user.name || user.email || "Admin";
}

export default function HistoryPage({
  user,
  activeEvent = null,
  eventHistory = [],
  requestHistory = [],
  requests = []
}) {
  const events = useMemo(() => {
    const eventMap = new Map();

    if (activeEvent?.eventId) {
      eventMap.set(activeEvent.eventId, {
        ...createEmptyEvent(
          activeEvent.eventId,
          activeEvent.eventName || "Active Event",
          activeEvent.eventDate || ""
        ),
        activatedAt: firstValue(activeEvent.activatedAt, activeEvent.createdAt),
        activatedByName: firstValue(
          activeEvent.activatedByName,
          activeEvent.activatedBy,
          activeEvent.byName,
          activeEvent.byEmail,
          "Not recorded"
        ),
        deactivatedAt: firstValue(activeEvent.deactivatedAt, activeEvent.terminatedAt),
        deactivatedByName: firstValue(
          activeEvent.deactivatedByName,
          activeEvent.terminatedByName,
          activeEvent.deactivatedBy,
          "Not recorded"
        ),
        reopenedAt: firstValue(activeEvent.reopenedAt, null),
        reopenedByName: firstValue(activeEvent.reopenedByName, "Not recorded"),
        source: "activeEvent"
      });
    }

    eventHistory.forEach((entry) => {
      const eventId = getEventId(entry);
      if (!eventId) return;

      const existing = eventMap.get(eventId) || createEmptyEvent(
        eventId,
        getEventName(entry),
        getEventDate(entry)
      );

      existing.eventName = getEventName(entry) || existing.eventName;
      existing.eventDate = getEventDate(entry) || existing.eventDate;

      if (isActivationAction(entry.action)) {
        existing.activatedAt = getActivationTime(entry) || existing.activatedAt;
        existing.activatedByName = getActivatedBy(entry) || existing.activatedByName;
      }

      if (isDeactivationAction(entry.action)) {
        existing.deactivatedAt = getDeactivationTime(entry) || existing.deactivatedAt;
        existing.deactivatedByName = getDeactivatedBy(entry) || existing.deactivatedByName;
        existing.reopenedAt = null;
        existing.reopenedByName = "Not recorded";
      }

      if (isReopenAction(entry.action)) {
        existing.reopenedAt = firstValue(entry.reopenedAt, entry.createdAt, entry.timestamp);
        existing.reopenedByName = firstValue(entry.reopenedByName, entry.byName, entry.byEmail, "Not recorded");
      }

      existing.source = existing.source === "activeEvent" ? "activeEvent" : "eventHistory";
      eventMap.set(eventId, existing);
    });

    requests.forEach((request) => {
      if (!request.eventId) return;

      const existing = eventMap.get(request.eventId) || createEmptyEvent(
        request.eventId,
        request.eventName || "Event",
        request.eventDate || ""
      );

      existing.eventName = request.eventName || existing.eventName;
      existing.eventDate = request.eventDate || existing.eventDate;

      const requestCreatedAt = getRequestCreatedAt(request);
      existing.firstRequestAt = earlierTime(existing.firstRequestAt, requestCreatedAt);
      existing.lastRequestAt = laterTime(existing.lastRequestAt, requestCreatedAt);

      if (existing.source === "unknown") existing.source = "requests";
      eventMap.set(request.eventId, existing);
    });

    return Array.from(eventMap.values()).sort((a, b) => {
      const aTime = getSortSeconds(a.reopenedAt || a.activatedAt || a.firstRequestAt || a.eventDate);
      const bTime = getSortSeconds(b.reopenedAt || b.activatedAt || b.firstRequestAt || b.eventDate);
      return bTime - aTime;
    });
  }, [activeEvent, eventHistory, requests]);

  const [selectedEventId, setSelectedEventId] = useState(null);
  const selectedEvent = events.find((event) => event.eventId === selectedEventId);
  const selectedRequestHistory = selectedEventId
    ? requestHistory.filter((entry) => entry.eventId === selectedEventId)
    : [];

  const reopenEvent = async (event) => {
    if (!user || user.role !== "admin") return;

    if (activeEvent?.eventId) {
      alert(`Cannot reopen '${event.eventName}' because '${activeEvent.eventName}' is currently active. Please deactivate the active event first.`);
      return;
    }

    if (!canReopenEvent(event, activeEvent)) {
      alert("This event cannot be reopened. Only inactive historical events can be reopened.");
      return;
    }

    const confirmed = window.confirm(
      `Reopen '${event.eventName}'? This will make it the active event again and existing requests for this event will become visible.`
    );

    if (!confirmed) return;

    const reopenedByName = adminName(user);

    await setDoc(doc(db, "system", "activeEvent"), {
      active: true,
      eventId: event.eventId,
      eventName: event.eventName,
      eventDate: event.eventDate || "",
      activatedAt: event.activatedAt || null,
      activatedByName: event.activatedByName || "Not recorded",
      reopenedAt: serverTimestamp(),
      reopenedByUid: user.uid,
      reopenedByName,
      deactivatedAt: null,
      deactivatedByUid: null,
      deactivatedByName: null
    });

    await addDoc(collection(db, "eventHistory"), {
      eventId: event.eventId,
      eventName: event.eventName,
      eventDate: event.eventDate || "",
      action: "reopened",
      details: "Event was reopened after being previously deactivated.",
      byUid: user.uid,
      byName: reopenedByName,
      reopenedAt: serverTimestamp(),
      reopenedByUid: user.uid,
      reopenedByName,
      createdAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="text-lg font-bold text-gray-900">Event History</h2>
          <p className="text-xs text-gray-500">
            Select an event to view the request activity recorded for that event.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            No event history or event request records were found yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2 font-bold min-w-[160px]">Event Title</th>
                  <th className="text-left px-3 py-2 font-bold min-w-[140px]">Date/Time Activation</th>
                  <th className="text-left px-3 py-2 font-bold min-w-[120px]">Activated By</th>
                  <th className="text-left px-3 py-2 font-bold min-w-[140px]">Date/Time Termination</th>
                  <th className="text-left px-3 py-2 font-bold min-w-[120px]">Terminated By</th>
                  <th className="text-left px-3 py-2 font-bold min-w-[150px]">History</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50 align-top">
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      <div>{event.eventName}</div>
                      {event.eventDate && (
                        <div className="text-xs font-normal text-gray-500">Event Date: {event.eventDate}</div>
                      )}
                      {event.reopenedAt && (
                        <div className="text-[11px] font-normal text-green-700 mt-1">
                          Reopened by {event.reopenedByName}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{displayActivationTime(event)}</td>
                    <td className="px-3 py-2 text-gray-700">{event.activatedByName || "Not recorded"}</td>
                    <td className="px-3 py-2 text-gray-700">{displayDeactivationTime(event)}</td>
                    <td className="px-3 py-2 text-gray-700">{event.deactivatedByName || "Not recorded"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedEventId(event.eventId)}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          View History
                        </button>

                        {user?.role === "admin" && canReopenEvent(event, activeEvent) && (
                          <button
                            type="button"
                            onClick={() => reopenEvent(event)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEvent && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Request Activity: {selectedEvent.eventName}
              </h2>
              <p className="text-xs text-gray-500">
                Showing request history records tied to this event.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEventId(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>

          {selectedRequestHistory.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No request activity has been recorded for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold min-w-[140px]">Date/Time</th>
                    <th className="text-left px-3 py-2 font-bold min-w-[110px]">Action</th>
                    <th className="text-left px-3 py-2 font-bold min-w-[140px]">By</th>
                    <th className="text-left px-3 py-2 font-bold min-w-[220px]">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {selectedRequestHistory.map((entry) => (
                    <tr key={entry.id || `${entry.requestId}-${entry.createdAt?.seconds || entry.action || "history"}`} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-2 text-gray-700">{formatDateTime(entry.createdAt || entry.timestamp)}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{entry.action || "Activity"}</td>
                      <td className="px-3 py-2 text-gray-700">{entry.byName || entry.byEmail || "Not recorded"}</td>
                      <td className="px-3 py-2 text-gray-700">{entry.details || "Not recorded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}