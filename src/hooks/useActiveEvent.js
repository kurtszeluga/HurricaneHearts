import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useActiveEvent(enabled) {
  const [activeEvent, setActiveEvent] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setActiveEvent(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "system", "activeEvent"),
      (snap) => {
        if (!snap.exists()) {
          setActiveEvent(null);
          return;
        }

        const data = snap.data();
        setActiveEvent(data.active ? { id: snap.id, ...data } : null);
      },
      (error) => {
        console.error("Active event listener error:", error);
        setActiveEvent(null);
      }
    );

    return () => unsub();
  }, [enabled]);

  return activeEvent;
}