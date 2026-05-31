import { useMemo, useState } from "react";
import RequestCard from "../components/RequestCard";
import { formatDateOnly } from "../utils/formatDate";

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
  requestFilter = { type: "status", value: "All" },
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
  }, [requests, requestFilter, search, user]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#172033]">Assistance Requests</h2>
            <div className="text-xs font-semibold text-[#b42318] mt-1">
              Showing: {requestFilter.value}
            </div>
            <p className="text-sm text-[#667085]">
              {activeEvent
                ? `Active Event: ${activeEvent.eventName} — ${formatDateOnly(activeEvent.eventDate)}`
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
                      ? "min-w-[68px] bg-[#b42318] text-white px-2 py-1 rounded-md text-[11px] leading-tight text-center font-semibold"
                      : "min-w-[68px] bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-2 py-1 rounded-md text-[11px] leading-tight text-center font-semibold"
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
                className="border border-[#c7d0dc] rounded-lg px-3 py-2 text-sm w-full lg:w-72"
              />

              <button
                type="button"
                onClick={() => setSearch("")}
                disabled={!search}
                className={
                  search
                    ? "bg-[#e2e8f0] hover:bg-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg text-sm font-semibold"
                    : "bg-[#e2e8f0] text-[#98a2b3] px-3 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"
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
                    ? "bg-[#b42318] hover:bg-[#9f1f16] text-white px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                    : "bg-[#e2e8f0] text-[#98a2b3] px-3 py-2 rounded-lg text-sm font-semibold cursor-not-allowed whitespace-nowrap"
                }
              >
                New Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {!activeEvent ? (
        <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-6 text-center text-[#667085]">
          No event is currently active. The request module will open when an admin activates an event.
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-6 text-center text-[#667085]">
          No requests match this filter.
        </div>
      ) : (
        <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm overflow-hidden">
          <div className="px-3 py-2 bg-[#f1f5f9] border-b border-[#c7d0dc] text-xs text-[#667085] flex flex-wrap gap-4 justify-end">
            <span><strong>N:</strong> # People Needed</span>
            <span><strong>C:</strong> Committed</span>
            <span><strong>R:</strong> Remaining</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f5f9] border-b border-[#c7d0dc] text-xs uppercase text-[#667085]">
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
