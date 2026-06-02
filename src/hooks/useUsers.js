import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useUsers(enabled) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Users listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [enabled]);

  return { users, loading };
}
