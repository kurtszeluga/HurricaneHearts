import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { useMemo, useState } from "react";
import { db } from "../firebase/config";

function formatDate(value) {
  if (!value) return "";

  if (value.toDate) {
    return value.toDate().toLocaleString();
  }

  if (typeof value === "string") {
    return new Date(value).toLocaleString();
  }

  return "";
}

export default function NotificationCenter({ notifications = [] }) {
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markRead = async (notificationId) => {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true
    });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);

    unread.forEach((notification) => {
      batch.update(doc(db, "notifications", notification.id), { read: true });
    });

    await batch.commit();
  };

  return (
    <div className="bg-white rounded-3xl shadow-md p-5 mb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-sm text-gray-500">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold"
          >
            {open ? "Hide" : "Show"} Notifications
          </button>

          <button
            onClick={markAllRead}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-semibold"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-5 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-gray-500 text-sm">No notifications yet.</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={
                  notification.read
                    ? "border rounded-2xl p-4 bg-gray-50"
                    : "border rounded-2xl p-4 bg-yellow-50 border-yellow-200"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{notification.title}</div>
                    <div className="text-sm text-gray-700 mt-1">{notification.message}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formatDate(notification.createdAt)}
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="bg-white border px-3 py-2 rounded-xl text-sm font-semibold"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}