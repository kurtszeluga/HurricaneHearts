import { useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "Unknown time";

  if (value.toDate) {
    return value.toDate().toLocaleString();
  }

  if (typeof value === "string") {
    return new Date(value).toLocaleString();
  }

  return "Unknown time";
}

export default function RequestHistory({ requestId, history }) {
  const [open, setOpen] = useState(false);

  const requestHistory = useMemo(() => {
    return history.filter((item) => item.requestId === requestId);
  }, [history, requestId]);

  return (
    <div className="border-t bg-gray-50 px-5 py-3">
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
            <div className="text-sm text-gray-500">No history recorded yet.</div>
          ) : (
            requestHistory.map((item) => (
              <div key={item.id} className="bg-white border rounded-2xl p-4 text-sm">
                <div className="font-bold capitalize">{item.action}</div>
                <div className="text-gray-600">By: {item.byName || "Unknown"}</div>
                <div className="text-gray-500">When: {formatDate(item.createdAt)}</div>
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