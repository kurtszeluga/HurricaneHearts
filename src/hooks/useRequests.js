import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function useRequests(
  enabled,
  activeEventId = null,
  canViewTeamRequests = false,
  currentUserUid = null
) {
  const [requests, setRequests] = useState([]);
  const canSubscribe =
    enabled && activeEventId && (canViewTeamRequests || currentUserUid);

  useEffect(() => {
    if (!canSubscribe) return;

    const requestQueries = canViewTeamRequests
      ? [query(collection(db, "requests"))]
      : [
          query(collection(db, "requests"), where("restrictedToTeam", "==", false)),
          query(collection(db, "requests"), where("residentUid", "==", currentUserUid))
        ];
    const queryRows = requestQueries.map(() => []);

    const publishRows = () => {
      const rowsById = new Map();
      queryRows.flat().forEach((request) => rowsById.set(request.id, request));

      setRequests(
        [...rowsById.values()]
          .filter((request) => request.eventId === activeEventId)
          .sort((a, b) => {
            const aSeconds = a.createdAt?.seconds || 0;
            const bSeconds = b.createdAt?.seconds || 0;
            return bSeconds - aSeconds;
          })
      );
    };

    const unsubs = requestQueries.map((requestQuery, index) =>
      onSnapshot(requestQuery, (snap) => {
        queryRows[index] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        publishRows();
      }, (error) => {
        console.error("Requests listener error:", error);
        queryRows[index] = [];
        publishRows();
      })
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [activeEventId, canSubscribe, canViewTeamRequests, currentUserUid]);

  return canSubscribe ? requests : [];
}
