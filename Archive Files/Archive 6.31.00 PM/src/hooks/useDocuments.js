import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useDocuments(enabled) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!enabled) {
      setDocuments([]);
      return;
    }

    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocuments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Document library listener error:", error);
        setDocuments([]);
      }
    );

    return () => unsub();
  }, [enabled]);

  return documents;
}