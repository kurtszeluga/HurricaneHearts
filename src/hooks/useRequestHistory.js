import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useRequestHistory(enabled, canViewTeamRequests = false) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const q = canViewTeamRequests
      ? query(collection(db, "requestHistory"))
      : query(collection(db, "requestHistory"), where("restrictedToTeam", "==", false));

    const unsub = onSnapshot(q, (snap) => {
      setHistory(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      );
    }, (error) => {
      console.error("Request history listener error:", error);
      setHistory([]);
    });

    return () => unsub();
  }, [enabled, canViewTeamRequests]);

  return history;
}
