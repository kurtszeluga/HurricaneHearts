import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useRequests(enabled, activeEventId = null, canViewTeamRequests = false) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!enabled || !activeEventId) {
      setRequests([]);
      return;
    }

    const q = canViewTeamRequests
      ? query(collection(db, "requests"))
      : query(collection(db, "requests"), where("restrictedToTeam", "==", false));

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRequests(
        rows
          .filter((request) => request.eventId === activeEventId)
          .sort((a, b) => {
            const aSeconds = a.createdAt?.seconds || 0;
            const bSeconds = b.createdAt?.seconds || 0;
            return bSeconds - aSeconds;
          })
      );
    }, (error) => {
      console.error("Requests listener error:", error);
      setRequests([]);
    });

    return () => unsub();
  }, [enabled, activeEventId, canViewTeamRequests]);

  return requests;
}
