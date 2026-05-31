import { useMemo, useState } from "react";
import { formatDateTime } from "../utils/formatDate";

export default function RequestHistory({ requestId, history }) {
  const [open, setOpen] = useState(false);

  const requestHistory = useMemo(() => {
    return history.filter((item) => item.requestId === requestId);
  }, [history, requestId]);

  return (
    <div className="border-t bg-[#f1f5f9] px-5 py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-gray-700 underline"
      >
        {open ? "Hide History" : `Show History (${requestHistory.length})`}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {requestHistory.length === 0 ? (
            <div className="text-sm text-[#667085]">No history recorded yet.</div>
          ) : (
            requestHistory.map((item) => (
              <div key={item.id} className="bg-white border rounded-lg p-4 text-sm">
                <div className="font-bold capitalize">{item.action}</div>
                <div className="text-[#475467]">By: {item.byName || "Unknown"}</div>
                <div className="text-[#667085]">When: {formatDateTime(item.createdAt) || "Unknown time"}</div>
                {item.details && (
                  <div className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {item.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
