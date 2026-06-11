import { useState } from "react";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import RequestCard from "../components/RequestCard";
import { formatDateOnly, formatDateTime } from "../utils/formatDate";
import { getRequestCategoryLabel, REQUEST_MEAL_CATEGORY } from "../utils/requestCategories";
import {
  getPeopleCommitted,
  getPeopleRemaining,
  normalizePeopleNeeded
} from "../utils/requestPeople";
import {
  getRequestStatusClass,
  isOpenRequestStatus
} from "../utils/requestStatus";

function getTimeValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function sortByCreatedAt(rows, direction) {
  return [...rows].sort((a, b) => {
    const comparison = getTimeValue(a.createdAt) - getTimeValue(b.createdAt);
    return direction === "asc" ? comparison : -comparison;
  });
}

function requestRowClass(request, defaultHover = "hover:bg-[#f1f5f9]") {
  return (request.categories || []).includes(REQUEST_MEAL_CATEGORY)
    ? "bg-[#fffbeb] hover:bg-[#fef3c7] align-top"
    : `${defaultHover} align-top`;
}

export default function HomePage({
  user,
  activeEvent,
  requests,
  users = [],
  requestHistory = [],
  onNewRequest,
  onGoToRequests,
  onEditRequest
}) {
  const [openDateSortDirection, setOpenDateSortDirection] = useState("desc");
  const [claimsDateSortDirection, setClaimsDateSortDirection] = useState("desc");
  const [myRequestsDateSortDirection, setMyRequestsDateSortDirection] = useState("desc");
  const [dashboardRequestAction, setDashboardRequestAction] = useState(null);

  const openDashboardRequestAction = (request, action) => {
    setDashboardRequestAction({
      request,
      action,
      token: Date.now()
    });
  };

  const myRequests = requests.filter((r) => r.residentUid === user.uid || r.residentEmail === user.email);
  const myClaims = requests.filter((r) => {
    const userIds = [user.uid, user.id].filter(Boolean);

    return (
      userIds.includes(r.assignedHelperUid) ||
      (r.claimCommitments || []).some((claim) => {
        return (
          userIds.includes(claim.uid) ||
          userIds.includes(claim.claimedByUid) ||
          claim.email === user.email
        );
      })
    );
  });

  const openRequests = requests.filter((r) => isOpenRequestStatus(r.status));
  const assignedRequests = requests.filter((r) => r.status === "Assigned");
  const partiallyClaimedRequests = requests.filter(
    (r) => isOpenRequestStatus(r.status) && Number(r.peopleCommitted || 0) > 0
  );
  const completedRequests = requests.filter((r) => r.status === "Completed");
  const cancelledRequests = requests.filter((r) => r.status === "Cancelled");

  const myActiveClaims = sortByCreatedAt(
    myClaims.filter((request) => {
      return request.status !== "Completed" && request.status !== "Cancelled";
    }),
    claimsDateSortDirection
  );

  const myActiveRequests = sortByCreatedAt(
    myRequests.filter((request) => {
      return request.status !== "Completed" && request.status !== "Cancelled";
    }),
    myRequestsDateSortDirection
  );
  const newOpenRequests = sortByCreatedAt(
    requests.filter((request) => {
      return (
        isOpenRequestStatus(request.status) &&
        request.residentUid !== user.uid &&
        request.residentEmail !== user.email
      );
    }),
    openDateSortDirection
  )
    .slice(0, 5);

  const getMyClaim = (request) => {
    const userIds = [user.uid, user.id].filter(Boolean);

    return (request.claimCommitments || []).find((claim) => {
      return (
        userIds.includes(claim.uid) ||
        userIds.includes(claim.claimedByUid) ||
        claim.email === user.email
      );
    }) || null;
  };

  const getClaimedBy = (request) => {
    if (request.assignedHelper) return request.assignedHelper;
    if (request.assignedHelperName) return request.assignedHelperName;

    const claimNames = (request.claimCommitments || [])
      .map((claim) => claim.name || claim.helperName || claim.email)
      .filter(Boolean);

    return claimNames.length > 0 ? claimNames.join(", ") : "—";
  };

  const completeClaimedRequest = async (request) => {
    const completionComment = window.prompt(
      "Please enter a completion comment before marking this request completed:"
    );

    if (!completionComment || !completionComment.trim()) {
      return;
    }

    try {
      const cleanComment = completionComment.trim();

      await updateDoc(doc(db, "requests", request.id), {
        status: "Completed",
        claimCommitments: (request.claimCommitments || []).map((claim) => {
          const safeClaim = { ...claim };
          delete safeClaim.email;
          delete safeClaim.phone;
          return safeClaim;
        }),
        completionComment: cleanComment,
        completedAt: new Date().toISOString(),
        completedByUid: user.uid,
        completedByName: user.name || user.email || "User",
        residentEmail: deleteField(),
        residentPhone: deleteField(),
        residentAddress: deleteField(),
        assignedHelperPhone: deleteField(),
        assignedHelperEmail: deleteField()
      });

      await addDoc(collection(db, "requestHistory"), {
        requestId: request.id,
        eventId: request.eventId || "",
        action: "completed",
        details: cleanComment,
        byUid: user.uid,
        byName: user.name || user.email || "User",
        restrictedToTeam: request.restrictedToTeam === true,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "notifications"), {
        toUid: request.residentUid,
        type: "request_completed",
        title: "Your request was completed",
        message: `${user.name || user.email || "A resident"} completed your request.`,
        requestId: request.id,
        eventId: request.eventId || "",
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Dashboard request completion error:", error);
      alert("Unable to complete this request. Please open My List and try again.");
    }
  };

  const categoryBadges = (request) => (
    <div className="flex flex-wrap justify-center gap-1 max-w-[220px] mx-auto">
      {(request.categories || []).slice(0, 2).map((category) => (
        <span key={category} className="bg-[#fff1f0] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-md text-xs font-semibold">
          {getRequestCategoryLabel(category)}
        </span>
      ))}
      {(request.categories || []).length > 2 && (
        <span className="bg-[#f2f4f7] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold">
          +{request.categories.length - 2}
        </span>
      )}
    </div>
  );

  const dateSortButton = (label, direction, setDirection) => (
    <button
      type="button"
      onClick={() =>
        setDirection((current) => current === "asc" ? "desc" : "asc")
      }
      className="font-bold text-[#b42318] hover:text-[#9f1f16]"
    >
      {label}{direction === "asc" ? " ▲" : " ▼"}
    </button>
  );

  const summaryButtonClass = "text-center rounded-md border px-2 py-2 font-semibold transition shadow-sm";
  const summaryItems = [
    {
      label: "Open",
      value: openRequests.length,
      filter: { type: "status", value: "Open" },
      className: "bg-[#eff6ff] hover:bg-[#dbeafe] border-[#bfdbfe] text-[#1d4ed8]"
    },
    {
      label: "Assigned",
      value: assignedRequests.length,
      filter: { type: "status", value: "Assigned" },
      className: "bg-[#fffbeb] hover:bg-[#fef3c7] border-[#fde68a] text-[#92400e]"
    },
    {
      label: "Partial",
      value: partiallyClaimedRequests.length,
      filter: { type: "special", value: "Partially Staffed" },
      className: "bg-[#fff7ed] hover:bg-[#ffedd5] border-[#fed7aa] text-[#9a3412]"
    },
    {
      label: "Completed",
      value: completedRequests.length,
      filter: { type: "status", value: "Completed" },
      className: "bg-[#ecfdf3] hover:bg-[#dcfae6] border-[#abefc6] text-[#067647]"
    },
    {
      label: "Cancelled",
      value: cancelledRequests.length,
      filter: { type: "status", value: "Cancelled" },
      className: "bg-[#f8fafc] hover:bg-[#eef2f6] border-[#d8e0ea] text-[#475467]"
    },
    {
      label: "My Requests",
      value: myRequests.length,
      filter: { type: "mine", value: "My Requests" },
      className: "bg-white hover:bg-[#f8fafc] border-[#d8e0ea] text-[#1f3a5f]"
    },
    {
      label: "My List",
      value: myClaims.length,
      filter: { type: "mine", value: "My List" },
      className: "bg-white hover:bg-[#f8fafc] border-[#d8e0ea] text-[#1f3a5f]"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d8e0ea] rounded-lg shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center gap-4 mb-4">
          <div className="text-center lg:col-start-2">
            <p className="text-[11px] font-bold uppercase text-[#b42318]">Current Activity</p>
            <h2 className="text-2xl font-bold text-[#172033] mt-1">Request Summary</h2>
            <p className="text-sm text-[#667085] leading-snug mt-1">
              {activeEvent
                ? `Active Event: ${activeEvent.eventName} — ${formatDateOnly(activeEvent.eventDate)}`
                : "No event is active. Request assistance is currently disabled."}
            </p>
          </div>

          <button
            type="button"
            onClick={onNewRequest}
            disabled={!activeEvent}
            className={
              activeEvent
                ? "bg-[#b42318] hover:bg-[#9f1f16] text-white px-4 py-3 rounded-md font-semibold text-sm whitespace-nowrap lg:justify-self-end"
                : "bg-[#e2e8f0] text-[#98a2b3] px-4 py-3 rounded-md font-semibold text-sm cursor-not-allowed whitespace-nowrap lg:justify-self-end"
            }
          >
            Request Assistance
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {summaryItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onGoToRequests(item.filter)}
              className={`${item.className} ${summaryButtonClass}`}
            >
              <span className="block text-xl font-bold leading-none">{item.value}</span>
              <span className="block text-[10px] uppercase mt-1 leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#d8e0ea] rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-[#fff7ed] border-b border-[#fed7aa] flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-3">
          <div className="text-center sm:col-start-2">
            <h2 className="text-lg font-bold text-[#172033]">New Open Requests</h2>
            <p className="text-xs text-[#667085]">
              Recent open requests from neighbors that may need help.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "status", value: "Open" })}
            className="bg-white hover:bg-[#ffedd5] border border-[#fed7aa] text-[#9a3412] px-3 py-2 rounded-md text-xs font-semibold sm:justify-self-end"
          >
            View Open Requests
          </button>
        </div>

        {newOpenRequests.length === 0 ? (
          <div className="p-4 text-sm text-[#667085] text-center">
            No new open requests right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f8fafc] border-b border-[#c7d0dc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="text-center px-2 py-2 font-bold min-w-[130px]">
                    {dateSortButton("Date/Time", openDateSortDirection, setOpenDateSortDirection)}
                  </th>
                  <th className="text-center px-2 py-2 font-bold min-w-[140px]">Name</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[150px]">Category</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">Urgency</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">People</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[120px]">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {newOpenRequests.map((request) => (
                  <tr key={request.id} className={requestRowClass(request, "hover:bg-[#fff7ed]")}>
                    <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
                      {formatDateTime(request.createdAt) || "Not recorded"}
                    </td>
                    <td className="px-2 py-2 font-semibold text-center text-[#172033]">
                      {request.residentName || "Resident"}
                    </td>
                    <td className="px-2 py-2">{categoryBadges(request)}</td>
                    <td className="px-2 py-2 text-center text-sm text-[#475467]">
                      {request.urgency || "Medium"}
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
                      <div>N: {normalizePeopleNeeded(request.peopleNeeded)}</div>
                      <div>C: {getPeopleCommitted(request)}</div>
                      <div>R: {getPeopleRemaining(request)}</div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDashboardRequestAction(request, "claim")}
                          className="bg-[#fff7ed] hover:bg-[#ffedd5] border border-[#fed7aa] text-[#9a3412] px-2 py-1 rounded-md text-xs font-semibold"
                        >
                          Volunteer
                        </button>
                        <button
                          type="button"
                          onClick={() => openDashboardRequestAction(request, "details")}
                          className="bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] px-2 py-1 rounded-md text-xs font-semibold"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#d8e0ea] rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#d8e0ea] flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-3">
          <div className="text-center sm:col-start-2">
            <h2 className="text-lg font-bold text-[#172033]">My List</h2>
            <p className="text-xs text-[#667085]">
              Requests where you have volunteered to help.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "mine", value: "My List" })}
            className="bg-white hover:bg-[#eef2f6] border border-[#d8e0ea] text-[#475467] px-3 py-2 rounded-md text-xs font-semibold sm:justify-self-end"
          >
            Manage My List
          </button>
        </div>

        {myActiveClaims.length === 0 ? (
          <div className="p-4 text-sm text-[#667085] text-center">
            You do not have any active volunteer commitments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f5f9] border-b border-[#c7d0dc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="text-center px-2 py-2 font-bold min-w-[130px]">
                    {dateSortButton("Date/Time", claimsDateSortDirection, setClaimsDateSortDirection)}
                  </th>
                  <th className="text-center px-2 py-2 font-bold min-w-[140px]">Name</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[150px]">Category</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[120px]">Volunteers</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[100px]">My Commitment</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[100px]">Status</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[140px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {myActiveClaims.map((request) => {
                  const myClaim = getMyClaim(request);

                  return (
                    <tr key={request.id} className={requestRowClass(request)}>
                      <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
                        {formatDateTime(request.createdAt) || "Not recorded"}
                      </td>
                      <td className="px-2 py-2 font-semibold text-center text-[#172033]">
                        {request.residentName || "Resident"}
                      </td>
                      <td className="px-2 py-2">{categoryBadges(request)}</td>
                      <td className="px-2 py-2 text-center text-xs text-[#475467]">
                        {getClaimedBy(request)}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-[#475467]">
                        {myClaim ? `${myClaim.peopleProvided || 1} people` : "Assigned"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getRequestStatusClass(request.status)}`}>
                          {request.status || "Open"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openDashboardRequestAction(request, "details")}
                            className="bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] px-2 py-1 rounded-md text-xs font-semibold"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditRequest(request)}
                            className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold"
                          >
                            Update Needed
                          </button>
                          <button
                            type="button"
                            onClick={() => completeClaimedRequest(request)}
                            className="bg-[#ecfdf3] hover:bg-[#dcfae6] border border-[#abefc6] text-[#067647] px-2 py-1 rounded-md text-xs font-semibold"
                          >
                            Complete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#d8e0ea] rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-[#f8fafc] border-b border-[#d8e0ea] flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-3">
          <div className="text-center sm:col-start-2">
            <h2 className="text-lg font-bold text-[#172033]">My Requests</h2>
            <p className="text-xs text-[#667085]">
              Requests you submitted or that were submitted on your behalf.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
            className="bg-white hover:bg-[#eef2f6] border border-[#d8e0ea] text-[#475467] px-3 py-2 rounded-md text-xs font-semibold sm:justify-self-end"
          >
            Manage My Requests
          </button>
        </div>

        {myActiveRequests.length === 0 ? (
          <div className="p-4 text-sm text-[#667085] text-center">
            You do not have any active requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f5f9] border-b border-[#c7d0dc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="text-center px-2 py-2 font-bold min-w-[130px]">
                    {dateSortButton("Date/Time", myRequestsDateSortDirection, setMyRequestsDateSortDirection)}
                  </th>
                  <th className="text-center px-2 py-2 font-bold min-w-[130px]">Category</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">Urgency</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">People</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[110px]">Volunteers</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">Status</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[120px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {myActiveRequests.map((request) => (
                  <tr key={request.id} className={requestRowClass(request)}>
                    <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
                      {formatDateTime(request.createdAt) || "Not recorded"}
                    </td>
                    <td className="px-2 py-2">{categoryBadges(request)}</td>
                    <td className="px-2 py-2 text-center text-sm text-[#475467]">{request.urgency || "Medium"}</td>
                    <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
                      <div>N: {normalizePeopleNeeded(request.peopleNeeded)}</div>
                      <div>C: {getPeopleCommitted(request)}</div>
                      <div>R: {getPeopleRemaining(request)}</div>
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-[#475467]">
                      {getClaimedBy(request)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getRequestStatusClass(request.status)}`}>
                        {request.status || "Open"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDashboardRequestAction(request, "details")}
                          className="bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] px-2 py-1 rounded-md text-xs font-semibold"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
                          className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dashboardRequestAction && (
        <RequestCard
          request={dashboardRequestAction.request}
          user={user}
          users={users}
          requestHistory={requestHistory}
          onEdit={onEditRequest}
          openAction={dashboardRequestAction.action}
          actionToken={dashboardRequestAction.token}
          onActionHandled={() =>
            setDashboardRequestAction((current) =>
              current ? { ...current, action: null } : null
            )
          }
          renderRow={false}
        />
      )}
    </div>
  );
}
