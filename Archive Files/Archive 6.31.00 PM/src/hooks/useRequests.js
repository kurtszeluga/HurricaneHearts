import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useRequests(enabled, activeEventId = null) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!enabled || !activeEventId) {
      setRequests([]);
      return;
    }

    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRequests(rows.filter((request) => request.eventId === activeEventId));
    });

    return () => unsub();
  }, [enabled, activeEventId]);

  return requests;
}