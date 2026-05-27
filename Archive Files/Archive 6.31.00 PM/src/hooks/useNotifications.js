import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useNotifications(user) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("toUid", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        rows.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        });

        setNotifications(rows);
      },
      (error) => {
        console.error("Notification listener error:", error);
        setNotifications([]);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  return notifications;
}