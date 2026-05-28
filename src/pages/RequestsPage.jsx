import { useMemo, useState } from "react";
import RequestCard from "../components/RequestCard";

const requestFilters = [
  { label: "All", type: "status", value: "All" },
  { label: "Open", type: "status", value: "Open" },
  { label: "Assigned", type: "status", value: "Assigned" },
  { label: "Completed", type: "status", value: "Completed" },
  { label: "Cancelled", type: "status", value: "Cancelled" },
  { label: "Partial", type: "special", value: "Partially Claimed" },
  { label: "My Requests", type: "mine", value: "My Requests" },
  { label: "My Claims", type: "mine", value: "My Claims" }
];

function isSameFilter(a, b) {
  return a?.type === b?.type && a?.value === b?.value;
}

function isMyClaim(request, user) {
  const userIds = [user.uid, user.id].filter(Boolean);

  return (
    userIds.includes(request.assignedHelperUid) ||
    (request.claimCommitments || []).some((claim) => {
      return (
        userIds.includes(claim.uid) ||
        userIds.includes(claim.claimedByUid) ||
        claim.email === user.email
      );
    })
  );
}

export default function RequestsPage({
  user,
  users = [],
  requests,
  onNewRequest,
  onEditRequest,
  activeEvent,
  requestFilter = { type: "status", value: "Open" },
  onRequestFilterChange
}) {
  const [search, setSearch] = useState("");
  const setRequestFilter = onRequestFilterChange || (() => {});

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests
      .filter((request) => {
        if (requestFilter.type === "status") {
          if (requestFilter.value === "All") return true;
          return request.status === requestFilter.value;
        }

        if (requestFilter.type === "special" && requestFilter.value === "Partially Claimed") {
          return request.status === "Open" && Number(request.peopleCommitted || 0) > 0;
        }

        if (requestFilter.type === "mine" && requestFilter.value === "My Requests") {
          return request.residentUid === user.uid || request.residentEmail === user.email;
        }

        if (requestFilter.type === "mine" && requestFilter.value === "My Claims") {
          return isMyClaim(request, user);
        }

        return true;
      })
      .filter((request) => {
        if (!term) return true;

        return (
          (request.residentName || "").toLowerCase().includes(term) ||
          (request.residentEmail || "").toLowerCase().includes(term) ||
          (request.residentPhone || "").toLowerCase().includes(term) ||
          (request.residentAddress || "").toLowerCase().includes(term) ||
          (request.need || "").toLowerCase().includes(term) ||
          (request.urgency || "").toLowerCase().includes(term) ||
          (request.status || "").toLowerCase().includes(term) ||
          (request.categories || []).some((category) =>
            category.toLowerCase().includes(term)
          )
        );
      });
  }, [requests, requestFilter, search, user.uid, user.id, user.email]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assistance Requests</h2>
            <div className="text-xs font-semibold text-red-700 mt-1">
              Showing: {requestFilter.value}
            </div>
            <p className="text-sm text-gray-500">
              {activeEvent
                ? `Active Event: ${activeEvent.eventName} — ${activeEvent.eventDate}`
                : "No event is active. Requests are currently disabled."}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
              {requestFilters.map((filter) => (
                <button
                  key={`${filter.type}-${filter.value}`}
                  type="button"
                  onClick={() => setRequestFilter(filter)}
                  className={
                    isSameFilter(requestFilter, filter)
                      ? "bg-red-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 w-full lg:justify-end">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests"
                className="border rounded-xl px-3 py-2 text-sm w-full lg:w-72"
              />

              <button
                type="button"
                onClick={() => setSearch("")}
                disabled={!search}
                className={
                  search
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold"
                    : "bg-gray-100 text-gray-400 px-3 py-2 rounded-xl text-sm font-semibold cursor-not-allowed"
                }
              >
                Clear
              </button>

              <button
                type="button"
                onClick={onNewRequest}
                disabled={!activeEvent}
                className={
                  activeEvent
                    ? "bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-semibold whitespace-nowrap"
                    : "bg-gray-200 text-gray-400 px-3 py-2 rounded-xl text-sm font-semibold cursor-not-allowed whitespace-nowrap"
                }
              >
                New Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {!activeEvent ? (
        <div className="bg-white border rounded-2xl shadow-sm p-6 text-center text-gray-500">
          No event is currently active. The request module will open when an admin activates an event.
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border rounded-2xl shadow-sm p-6 text-center text-gray-500">
          No requests match this filter.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-600 flex flex-wrap gap-4 justify-end">
            <span><strong>N:</strong> # People Needed</span>
            <span><strong>C:</strong> Committed</span>
            <span><strong>R:</strong> Remaining</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="text-left px-2 py-2 font-bold min-w-[120px]">Name</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[120px]">Category</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[70px]">Urgency</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[100px]">People</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[90px]">Status</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[120px]">Claimed By</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[150px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    user={user}
                    users={users}
                    onEdit={onEditRequest}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}