import { useState } from "react";
import { createPortal } from "react-dom";
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { formatDateOnly, formatDateTime } from "../utils/formatDate";
import { formatPhoneNumber } from "../utils/formatPhoneNumber";
import {
  queueRequestCancelledEmails,
  queueRequestClaimedEmails
} from "../utils/emailNotifications";

const urgencyColors = {
  Low: "bg-[#ecfdf3] text-[#067647] border border-[#abefc6]",
  Medium: "bg-[#fffbeb] text-[#92400e] border border-[#fde68a]",
  High: "bg-[#fff7ed] text-[#9a3412] border border-[#fed7aa]",
  Critical: "bg-[#fff1f0] text-[#b42318] border border-[#fecdca]"
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getClaimedBy(request) {
  if (request.assignedHelper) return request.assignedHelper;
  if (request.assignedHelperName) return request.assignedHelperName;

  const claimNames = (request.claimCommitments || [])
    .map((claim) => claim.name || claim.helperName || claim.email)
    .filter(Boolean);

  return claimNames.length > 0 ? claimNames.join(", ") : "—";
}

async function addRequestHistory({ requestId, eventId = "", action, user, details = "" }) {
  await addDoc(collection(db, "requestHistory"), {
    requestId,
    eventId,
    action,
    details,
    byUid: user.uid,
    byName: user.name || user.email || "User",
    byEmail: user.email || "",
    createdAt: serverTimestamp()
  });
}

async function addNotification({ toUid, type, title, message, requestId, eventId = "" }) {
  if (!toUid) return;

  await addDoc(collection(db, "notifications"), {
    toUid,
    type,
    title,
    message,
    requestId: requestId || "",
    eventId,
    read: false,
    createdAt: serverTimestamp()
  });
}

function getPeopleCommitted(request) {
  if (typeof request.peopleCommitted === "number") return request.peopleCommitted;

  return (request.claimCommitments || []).reduce((sum, claim) => {
    return sum + Number(claim.peopleProvided || 0);
  }, 0);
}

function getPeopleRemaining(request) {
  if (request.peopleNeeded === "Unknown" || request.peopleNeeded === undefined) return "Unknown";

  const needed = Number(request.peopleNeeded || 0);
  const committed = getPeopleCommitted(request);

  return Math.max(needed - committed, 0);
}

function RequestDetailsModal({ request, peopleNeeded, peopleCommitted, peopleRemaining, onClose }) {
  const printDetails = () => window.print();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold">Request Details</h2>

          <div className="flex gap-2">
            <button
              onClick={printDetails}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm"
            >
              Print
            </button>

            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6 print:p-0">
          <div className="mb-5">
            <h1 className="text-2xl font-bold">{request.residentName || "Resident"}</h1>
            <p className="text-gray-500">Hurricane Hearts Request Detail</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-5 text-sm">
            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Event</div>
              <div>{request.eventName || "Not provided"}</div>
              <div className="text-gray-500">{formatDateOnly(request.eventDate) || "No event date"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Status</div>
              <div>{request.status || "Open"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Claimed By</div>
              <div>{getClaimedBy(request)}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Name</div>
              <div>{request.residentName || "Resident"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Phone</div>
              <div>{formatPhoneNumber(request.residentPhone) || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Email</div>
              <div className="break-all">{request.residentEmail || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Address</div>
              <div>{request.residentAddress || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Urgency</div>
              <div>{request.urgency || "Medium"}</div>
            </div>

            <div className="border rounded-2xl p-3">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">People</div>
              <div>Needed: {peopleNeeded}</div>
              <div>Committed: {peopleCommitted}</div>
              <div>Remaining: {peopleRemaining}</div>
            </div>
          </div>

          <div className="border rounded-2xl p-3 mb-5 text-sm">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Categories</div>
            <div className="flex flex-wrap gap-2">
              {(request.categories || []).map((category) => (
                <span key={category} className="bg-red-50 text-red-700 px-2 py-1 rounded-lg text-xs font-semibold">
                  {category}
                </span>
              ))}
              {(request.categories || []).length === 0 && <span>Not provided</span>}
            </div>
          </div>

          <div className="border rounded-2xl p-3 mb-5 text-sm">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Need / Request Description</div>
            <div className="whitespace-pre-wrap">{request.need || "No details provided"}</div>
          </div>

          {(request.claimCommitments || []).length > 0 && (
            <div className="border rounded-2xl p-3 mb-5 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Claims</div>
              <div className="space-y-2">
                {(request.claimCommitments || []).map((claim) => (
                  <div key={`${claim.uid}-${claim.claimedAt}`} className="bg-blue-50 text-blue-800 p-3 rounded-xl">
                    <div className="font-bold">{claim.name}</div>
                    <div>{claim.peopleProvided} people</div>
                    {claim.phone && <div>Phone: {formatPhoneNumber(claim.phone)}</div>}
                    {claim.email && <div>Email: {claim.email}</div>}
                    {claim.comment && <div>Comment: {claim.comment}</div>}
                    {claim.claimedAt && <div className="text-xs mt-1">Claimed: {formatDateTime(claim.claimedAt) || "Not recorded"}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.completionComment && (
            <div className="border rounded-2xl p-3 mb-5 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Completion Comment</div>
              <div>{request.completionComment}</div>
            </div>
          )}

          {request.cancellationReason && (
            <div className="border rounded-2xl p-3 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Cancellation Reason</div>
              <div>{request.cancellationReason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestCard({ request, user, users = [], onEdit }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimPeople, setClaimPeople] = useState("1");
  const [claimComment, setClaimComment] = useState("");
  const [claimHelperUid, setClaimHelperUid] = useState(user.uid);

  const isOwner = request.residentUid === user.uid;
  const isClaimedByCurrentUser = (request.claimCommitments || []).some((claim) => claim.uid === user.uid);
  const isAdmin = user.role === "admin";
  const canEditRequest = isOwner || isAdmin;
  const eligibleHelpers = users
    .filter((u) => u.active !== false && u.approved !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const selectedHelper = isAdmin
    ? eligibleHelpers.find((helper) => helper.uid === claimHelperUid || helper.id === claimHelperUid) || user
    : user;

  const peopleNeeded = request.peopleNeeded ?? "Unknown";
  const peopleCommitted = getPeopleCommitted(request);
  const peopleRemaining = getPeopleRemaining(request);
  const claimedBy = getClaimedBy(request);
  const canClaim = !isOwner && request.status === "Open" && !isClaimedByCurrentUser;

  const claimRequest = async () => {
    if (!isAdmin && request.residentUid === user.uid) {
      alert("You cannot claim your own request.");
      return;
    }

    if (isAdmin && (selectedHelper.uid || selectedHelper.id) === request.residentUid) {
      alert("The requestor cannot be selected as the helper for their own request.");
      return;
    }

    const peopleProvided = Number(claimPeople);

    if (!Number.isInteger(peopleProvided) || peopleProvided < 1) {
      alert("Please select the number of people you can provide.");
      return;
    }

    if (peopleRemaining !== "Unknown" && peopleProvided > peopleRemaining) {
      alert(`Only ${peopleRemaining} more people are needed for this request.`);
      return;
    }

    if (!claimComment.trim()) {
      alert("A short claim comment is required.");
      return;
    }

    const requestRef = doc(db, "requests", request.id);
    const freshSnap = await getDoc(requestRef);

    if (!freshSnap.exists()) {
      alert("This request no longer exists.");
      return;
    }

    const fresh = { id: freshSnap.id, ...freshSnap.data() };
    const freshClaims = fresh.claimCommitments || [];

    if (freshClaims.some((claim) => claim.uid === (selectedHelper.uid || selectedHelper.id))) {
      alert("This helper has already claimed this request.");
      return;
    }

    const freshRemaining = getPeopleRemaining(fresh);

    if (freshRemaining !== "Unknown" && peopleProvided > freshRemaining) {
      alert(`Only ${freshRemaining} more people are needed for this request.`);
      return;
    }

    const newClaim = {
      uid: selectedHelper.uid || selectedHelper.id,
      name: selectedHelper.name || selectedHelper.email || "User",
      email: selectedHelper.email || "",
      phone: formatPhoneNumber(selectedHelper.phone || ""),
      claimedByUid: user.uid,
      claimedByName: user.name || user.email || "User",
      claimedOnBehalf: isAdmin && (selectedHelper.uid || selectedHelper.id) !== user.uid,
      peopleProvided,
      comment: claimComment.trim(),
      claimedAt: new Date().toISOString()
    };

    const nextClaims = [...freshClaims, newClaim];
    const nextCommitted = nextClaims.reduce((sum, claim) => sum + Number(claim.peopleProvided || 0), 0);
    const nextRemaining =
      fresh.peopleNeeded === "Unknown"
        ? "Unknown"
        : Math.max(Number(fresh.peopleNeeded || 0) - nextCommitted, 0);
    const nextStatus = nextRemaining === 0 ? "Assigned" : "Open";

    await updateDoc(requestRef, {
      claimCommitments: nextClaims,
      peopleCommitted: nextCommitted,
      peopleRemaining: nextRemaining,
      status: nextStatus,
      assignedHelper: nextClaims.map((claim) => claim.name).join(", "),
      assignedHelperUid: nextClaims[0]?.uid || null,
      assignedHelperPhone: nextClaims.map((claim) => formatPhoneNumber(claim.phone)).filter(Boolean).join(", "),
      assignedHelperEmail: nextClaims.map((claim) => claim.email).filter(Boolean).join(", ")
    });

    await addRequestHistory({
      requestId: request.id,
      eventId: request.eventId || "",
      action: "claimed",
      user,
      details: isAdmin && (selectedHelper.uid || selectedHelper.id) !== user.uid
        ? `${user.name || user.email || "Admin"} claimed ${peopleProvided} people on behalf of ${selectedHelper.name || selectedHelper.email || "helper"}. Comment: ${claimComment.trim()}`
        : `${user.name || user.email || "User"} claimed ${peopleProvided} people. Comment: ${claimComment.trim()}`
    });

    await addNotification({
      toUid: request.residentUid,
      type: "request_claimed",
      title: "Your request was claimed",
      message: `${selectedHelper.name || selectedHelper.email || "A resident"} committed ${peopleProvided} people. ${nextRemaining === "Unknown" ? "People needed is still unknown." : `${nextRemaining} more needed.`}`,
      requestId: request.id,
      eventId: request.eventId || ""
    });

    await queueRequestClaimedEmails(db, {
      request: {
        ...fresh,
        id: request.id,
        claimCommitments: nextClaims,
        peopleCommitted: nextCommitted,
        peopleRemaining: nextRemaining,
        status: nextStatus
      },
      claim: newClaim
    }).catch((error) => {
      console.error("Request claimed email error:", error);
    });

    setShowClaimForm(false);
    setClaimPeople("1");
    setClaimComment("");
    setClaimHelperUid(user.uid);
  };

  const completeRequest = async () => {
    const completionComment = window.prompt(
      "Please enter a completion comment before marking this request completed:"
    );

    if (!completionComment || !completionComment.trim()) {
      alert("A completion comment is required.");
      return;
    }

    await updateDoc(doc(db, "requests", request.id), {
      status: "Completed",
      completionComment: completionComment.trim(),
      completedAt: new Date().toISOString(),
      completedByUid: user.uid,
      completedByName: user.name || user.email || "User"
    });

    await addRequestHistory({
      requestId: request.id,
      eventId: request.eventId || "",
      action: "completed",
      user,
      details: completionComment.trim()
    });

    await addNotification({
      toUid: request.residentUid,
      type: "request_completed",
      title: "Your request was completed",
      message: `${user.name || user.email || "A resident"} completed your request.`,
      requestId: request.id,
      eventId: request.eventId || ""
    });
  };

  const cancelRequest = async () => {
    const reason = window.prompt("Please enter a reason for cancelling this request:");

    if (!reason || !reason.trim()) {
      alert("A cancellation reason is required.");
      return;
    }

    await updateDoc(doc(db, "requests", request.id), {
      status: "Cancelled",
      cancellationReason: reason.trim(),
      cancelledAt: new Date().toISOString(),
      cancelledByUid: user.uid,
      cancelledByName: user.name || user.email || "User"
    });

    await addRequestHistory({
      requestId: request.id,
      eventId: request.eventId || "",
      action: "cancelled",
      user,
      details: reason.trim()
    });

    if (request.residentUid !== user.uid) {
      await addNotification({
        toUid: request.residentUid,
        type: "request_cancelled",
        title: "Your request was cancelled",
        message: `${user.name || user.email || "An admin"} cancelled your request. Reason: ${reason.trim()}`,
        requestId: request.id,
        eventId: request.eventId || ""
      });
    }

    await queueRequestCancelledEmails(db, {
      request,
      cancelledBy: user,
      reason: reason.trim()
    }).catch((error) => {
      console.error("Request cancelled email error:", error);
    });
  };

  return (
    <>
      <tr className="hover:bg-[#f1f5f9] align-top">
        <td className="px-2 py-2">
          <div className="font-semibold text-[#172033] text-sm">
            {request.residentName || "Resident"}
          </div>
        </td>

        <td className="px-2 py-2">
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {(request.categories || []).slice(0, 2).map((category) => (
              <span
                key={category}
                className="bg-[#fff1f0] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-md text-xs font-semibold"
              >
                {category}
              </span>
            ))}
            {(request.categories || []).length > 2 && (
              <span className="bg-[#f2f4f7] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold">
                +{request.categories.length - 2}
              </span>
            )}
          </div>
        </td>

        <td className="px-2 py-2">
          <span
            className={classNames(
              "px-2 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap",
              urgencyColors[request.urgency] || urgencyColors.Medium
            )}
          >
            {request.urgency || "Medium"}
          </span>
        </td>

        <td className="px-2 py-2 text-xs text-[#475467] whitespace-nowrap">
          <div>N: {peopleNeeded}</div>
          <div>C: {peopleCommitted}</div>
          <div>R: {peopleRemaining}</div>
        </td>

        <td className="px-2 py-2">
          <span className="inline-flex px-2 py-1 rounded-full bg-[#f2f4f7] text-[#344054] text-xs font-bold">
            {request.status || "Open"}
          </span>
        </td>

        <td className="px-2 py-2 text-xs text-[#475467] min-w-[120px]">
          {claimedBy}
        </td>

        <td className="px-2 py-2">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setShowDetails(true)}
              className="bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] px-2 py-1 rounded-md text-xs font-semibold"
            >
              Details
            </button>

            {canEditRequest && request.status !== "Cancelled" && request.status !== "Completed" && (
              <button
                onClick={() => onEdit(request)}
                className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold"
              >
                Edit
              </button>
            )}

            {canEditRequest && request.status !== "Cancelled" && request.status !== "Completed" && (
              <button
                onClick={cancelRequest}
                className="bg-[#fff1f0] hover:bg-[#fee4e2] border border-[#fecdca] text-[#b42318] px-2 py-1 rounded-md text-xs font-semibold"
              >
                Cancel
              </button>
            )}

            {canClaim && (
              <button
                onClick={() => setShowClaimForm(true)}
                className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-2 py-1 rounded-md text-xs font-semibold"
              >
                Claim
              </button>
            )}

            {request.status === "Assigned" && (isClaimedByCurrentUser || isAdmin) && (
              <button
                onClick={completeRequest}
                className="bg-[#16803c] hover:bg-[#126b32] text-white px-2 py-1 rounded-md text-xs font-semibold"
              >
                Complete
              </button>
            )}
          </div>
        </td>
      </tr>

      {showDetails &&
        createPortal(
          <RequestDetailsModal
            request={request}
            peopleNeeded={peopleNeeded}
            peopleCommitted={peopleCommitted}
            peopleRemaining={peopleRemaining}
            onClose={() => setShowDetails(false)}
          />,
          document.body
        )}

      {showClaimForm &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[#c7d0dc] rounded-xl shadow-2xl p-5 w-full max-w-md">
              <h2 className="text-xl font-bold mb-2">Claim Request</h2>
              <p className="text-sm text-[#667085] mb-4">
                Select the number of people you can provide and add a short comment.
              </p>

              {isAdmin && (
                <>
                  <label className="block text-sm font-semibold mb-2">
                    Claim On Behalf Of
                  </label>
                  <select
                    value={claimHelperUid}
                    onChange={(e) => setClaimHelperUid(e.target.value)}
                    className="w-full border border-[#c7d0dc] rounded-lg p-3 mb-4 bg-white"
                  >
                    <option value={user.uid}>Myself</option>
                    {eligibleHelpers
                      .filter((helper) => (helper.uid || helper.id) !== request.residentUid)
                      .map((helper) => (
                        <option
                          key={helper.uid || helper.id}
                          value={helper.uid || helper.id}
                        >
                          {helper.name || helper.email || "Unnamed Resident"}
                        </option>
                      ))}
                  </select>
                </>
              )}

              <label className="block text-sm font-semibold mb-2">
                Number of People
              </label>
              <select
                value={claimPeople}
                onChange={(e) => setClaimPeople(e.target.value)}
                className="w-full border border-[#c7d0dc] rounded-lg p-3 mb-4 bg-white"
              >
                {Array.from(
                  { length: peopleRemaining === "Unknown" ? 10 : Math.max(Number(peopleRemaining), 1) },
                  (_, index) => index + 1
                ).map((number) => (
                  <option key={number} value={number}>{number}</option>
                ))}
              </select>

              <label className="block text-sm font-semibold mb-2">
                Comment
              </label>
              <textarea
                value={claimComment}
                onChange={(e) => setClaimComment(e.target.value)}
                placeholder="Example: I can bring two people and hand tools."
                className="w-full border border-[#c7d0dc] rounded-lg p-3 min-h-[90px] mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowClaimForm(false);
                    setClaimPeople("1");
                    setClaimComment("");
                    setClaimHelperUid(user.uid);
                  }}
                  className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={claimRequest}
                  className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Submit Claim
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
