import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useRequestHistory(enabled) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const q = query(collection(db, "requestHistory"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [enabled]);

  return history;
}