import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export default function useUsers(enabled, user = null) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (user?.teamMember !== true && user?.role !== "admin") {
      let cancelled = false;

      auth.currentUser?.getIdToken()
        .then((token) =>
          fetch("/api/directory", {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
        .then(async (response) => {
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.error || "Unable to load directory.");
          if (!cancelled) setUsers(body.users || []);
        })
        .catch((error) => {
          console.error("Directory API error:", error);
          if (!cancelled) setUsers([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Users listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [enabled, user?.role, user?.teamMember]);

  return { users, loading };
}
