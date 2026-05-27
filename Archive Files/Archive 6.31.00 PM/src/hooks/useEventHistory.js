import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useEventHistory(enabled) {
  const [eventHistory, setEventHistory] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setEventHistory([]);
      return;
    }

    const q = query(collection(db, "eventHistory"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setEventHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Event history listener error:", error);
        setEventHistory([]);
      }
    );

    return () => unsub();
  }, [enabled]);

  return eventHistory;
}