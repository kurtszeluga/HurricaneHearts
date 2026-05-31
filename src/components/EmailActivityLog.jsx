import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "../firebase/config";
import { formatDateTime } from "../utils/formatDate";

function formatRecipients(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}

function formatEmailType(type) {
  if (type === "access-request-welcome") return "Welcome";
  if (type === "admin-access-request") return "Pending Approval";
  if (type === "account-approved") return "Approval";
  if (type === "request-claimed-requestor") return "Claimed - Requestor";
  if (type === "request-claimed-claimant") return "Claimed - Claimant";
  if (type === "request-cancelled-requestor") return "Cancelled - Requestor";
  if (type === "request-cancelled-admin") return "Cancelled - Admin";
  if (type === "admin-blast-active-users") return "Blast Email";

  return type || "Email";
}

function statusClasses(status) {
  if (status === "sent") {
    return "bg-[#ecfdf3] text-[#067647]";
  }

  if (status === "dry-run" || status === "disabled") {
    return "bg-[#fef7c3] text-[#93370d]";
  }

  if (status === "error") {
    return "bg-[#fef3f2] text-[#b42318]";
  }

  return "bg-[#f1f5f9] text-[#475467]";
}

export default function EmailActivityLog() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const emailQuery = query(
      collection(db, "mailQueue"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      emailQuery,
      (snapshot) => {
        setEmails(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );
        setErrorMessage("");
        setLoading(false);
      },
      (error) => {
        console.error("Email activity load error:", error);
        setErrorMessage("Unable to load recent email activity.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const summary = useMemo(() => {
    return emails.reduce(
      (counts, email) => ({
        ...counts,
        [email.status || "unknown"]:
          (counts[email.status || "unknown"] || 0) + 1
      }),
      {}
    );
  }, [emails]);

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172033] underline underline-offset-4">
            Recent Email Activity
          </h2>
          <p className="text-sm text-[#667085] mt-2">
            Latest automated email attempts from the app.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(summary).map(([status, count]) => (
            <span
              key={status}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}
            >
              {count} {status}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-[#c7d0dc]">
        <div className="hidden bg-[#f8fafc] px-4 py-3 text-xs font-bold uppercase text-[#667085] sm:grid sm:grid-cols-[1.1fr_1.6fr_0.8fr_1fr] sm:gap-3">
          <span>Type</span>
          <span>Recipient</span>
          <span>Status</span>
          <span>Time</span>
        </div>

        {loading ? (
          <div className="bg-[#f8fafc] px-4 py-5 text-center text-sm text-[#667085]">
            Loading email activity...
          </div>
        ) : errorMessage ? (
          <div className="bg-[#fef3f2] px-4 py-5 text-center text-sm font-semibold text-[#b42318]">
            {errorMessage}
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-[#f8fafc] px-4 py-5 text-center text-sm text-[#667085]">
            No email activity yet.
          </div>
        ) : (
          emails.map((email) => (
            <div
              key={email.id}
              className="border-t border-[#e4e7ec] px-4 py-4 text-sm sm:grid sm:grid-cols-[1.1fr_1.6fr_0.8fr_1fr] sm:items-center sm:gap-3"
            >
              <div>
                <div className="font-semibold text-[#172033]">
                  {formatEmailType(email.type)}
                </div>
                <div className="mt-1 text-xs text-[#667085]">
                  {email.delivery || "legacy"}
                </div>
              </div>

              <div className="mt-3 break-words text-[#475467] sm:mt-0">
                {formatRecipients(email.to)}
              </div>

              <div className="mt-3 sm:mt-0">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(email.status)}`}
                >
                  {email.status || "unknown"}
                </span>
              </div>

              <div className="mt-3 text-[#667085] sm:mt-0">
                {formatDateTime(email.createdAt)}
              </div>

              {email.errorMessage && (
                <div className="mt-3 rounded-lg bg-[#fef3f2] px-3 py-2 text-xs font-semibold text-[#b42318] sm:col-span-4">
                  {email.errorMessage}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
