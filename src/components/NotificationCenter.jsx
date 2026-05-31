import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { useMemo, useState } from "react";
import { db } from "../firebase/config";
import { formatDateTime } from "../utils/formatDate";

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
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172033]">Notifications</h2>
          <p className="text-sm text-[#667085]">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-4 py-2 rounded-lg font-semibold"
          >
            {open ? "Hide" : "Show"} Notifications
          </button>

          <button
            onClick={markAllRead}
            className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-4 py-2 rounded-lg font-semibold"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-5 space-y-3">
          {notifications.length === 0 ? (
            <div className="border border-dashed border-[#c7d0dc] rounded-lg bg-[#f1f5f9] p-5 text-center text-[#667085] text-sm">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={
                  notification.read
                    ? "border border-[#c7d0dc] rounded-lg p-4 bg-[#f1f5f9]"
                    : "border border-[#fde68a] rounded-lg p-4 bg-[#fffbeb]"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#172033]">{notification.title}</div>
                    <div className="text-sm text-[#475467] mt-1">{notification.message}</div>
                    <div className="text-xs text-[#667085] mt-2">
                      {formatDateTime(notification.createdAt)}
                    </div>
                  </div>

                  {!notification.read && (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] px-3 py-2 rounded-lg text-sm font-semibold"
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
