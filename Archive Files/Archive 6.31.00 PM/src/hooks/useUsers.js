import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useUsers(enabled) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [enabled]);

  return users;
}