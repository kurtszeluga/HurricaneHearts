import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addDoc, collection, deleteField, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { formatAddress } from "../utils/addressFields";
import { formatDateOnly, formatDateTime } from "../utils/formatDate";
import { formatPhoneNumber } from "../utils/formatPhoneNumber";
import {
  queueRequestCancelledEmails,
  queueRequestClaimedEmails
} from "../utils/emailNotifications";
import {
  categoryDescriptions,
  getRequestCategoryLabel,
  REQUEST_MEAL_CATEGORY
} from "../utils/requestCategories";
import {
  getPeopleCommitted,
  getPeopleRemaining,
  normalizePeopleNeeded
} from "../utils/requestPeople";
import {
  getRequestDisplayStatus,
  getRequestStatusClass,
  isOpenRequestStatus
} from "../utils/requestStatus";

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

function sanitizeClaims(claims = []) {
  return claims.map((claim) => {
    const safeClaim = { ...claim };
    delete safeClaim.email;
    delete safeClaim.phone;
    return safeClaim;
  });
}

async function addRequestHistory({
  requestId,
  eventId = "",
  action,
  user,
  details = "",
  restrictedToTeam = false
}) {
  await addDoc(collection(db, "requestHistory"), {
    requestId,
    eventId,
    action,
    details,
    byUid: user.uid,
    byName: user.name || user.email || "User",
    restrictedToTeam,
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

function getLatestClaimedAt(request) {
  return (request.claimCommitments || [])
    .map((claim) => claim.claimedAt)
    .filter(Boolean)
    .sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateB - dateA;
    })[0];
}

function getStatusDateMeta(request) {
  const displayStatus = getRequestDisplayStatus(request);

  if (request.status === "Completed") {
    return { label: "Completed", value: request.completedAt };
  }

  if (request.status === "Cancelled") {
    return { label: "Cancelled", value: request.cancelledAt };
  }

  if (request.status === "Assigned") {
    return { label: "Assigned", value: getLatestClaimedAt(request) };
  }

  if (displayStatus === "Re-Opened") {
    return { label: "Re-Opened", value: request.reopenedAt || request.updatedAt };
  }

  return { label: "Created", value: request.createdAt };
}

function getHistoryTimeValue(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatHistoryAction(action) {
  if (!action) return "Updated";
  if (action === "claimed") return "Volunteered";
  return action
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailItem({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase text-[#667085]">{label}</div>
      <div className="break-words text-sm text-[#172033]">{children}</div>
    </div>
  );
}

function CompactSection({ title, children }) {
  return (
    <section className="rounded-lg border border-[#d8e0ea] bg-white p-3 text-sm">
      <h3 className="mb-2 text-xs font-bold uppercase text-[#667085]">{title}</h3>
      {children}
    </section>
  );
}

function CollapsibleSection({ title, count, children }) {
  return (
    <details className="rounded-lg border border-[#d8e0ea] bg-white text-sm">
      <summary className="cursor-pointer px-3 py-2 text-xs font-bold uppercase text-[#667085]">
        {title}{typeof count === "number" ? ` (${count})` : ""}
      </summary>
      <div className="border-t border-[#e4e7ec] p-3">
        {children}
      </div>
    </details>
  );
}

function RequestDetailsModal({
  request,
  requestHistory = [],
  contactData = null,
  canViewContactInfo = false,
  peopleNeeded,
  peopleCommitted,
  peopleRemaining,
  onClose
}) {
  const printDetails = () => window.print();
  const sortedHistory = [...requestHistory].sort((a, b) => {
    return getHistoryTimeValue(a.createdAt || a.timestamp) - getHistoryTimeValue(b.createdAt || b.timestamp);
  });
  const contactsByUid = new Map(
    (contactData?.contacts || []).map((contact) => [contact.uid, contact])
  );
  const requestorContact = contactsByUid.get(request.residentUid);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white p-3 border-b flex items-center justify-between gap-3 print:hidden">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">Request Details</h2>
            <div className="text-xs text-[#667085] truncate">
              {request.residentName || "Resident"}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={printDetails}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-xs"
            >
              Print
            </button>

            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-semibold text-xs"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-3 print:p-0">
          <div className="mb-3">
            <h1 className="text-2xl font-bold">{request.residentName || "Resident"}</h1>
            <p className="text-gray-500">Hurricane Hearts Request Detail</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div className="border rounded-lg p-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Event</div>
              <div>{request.eventName || "Not provided"}</div>
              <div className="text-gray-500">{formatDateOnly(request.eventDate) || "No event date"}</div>
            </div>

            <div className={`rounded-lg border p-2 ${getRequestDisplayStatus(request) === "Re-Opened" ? "border-[#fde68a] bg-[#fef3c7] text-[#92400e]" : ""}`}>
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Status</div>
              <div>{getRequestDisplayStatus(request)}</div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Volunteers</div>
              <div>{getClaimedBy(request)}</div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Name</div>
              <div>{request.residentName || "Resident"}</div>
            </div>

            {canViewContactInfo && (
              <>
                <div className="border rounded-lg p-2">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">Phone</div>
                  <div>{formatPhoneNumber(requestorContact?.phone || request.residentPhone) || "Not provided"}</div>
                </div>

                <div className="border rounded-lg p-2">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">Email</div>
                  <div className="break-all">{requestorContact?.email || request.residentEmail || "Not provided"}</div>
                </div>

                <div className="border rounded-lg p-2">
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">Address</div>
                  <div>{formatAddress(requestorContact || {}) || request.residentAddress || "Not provided"}</div>
                </div>
              </>
            )}

            <div className="border rounded-lg p-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Urgency</div>
              <div>{request.urgency || "Medium"}</div>
            </div>

            <div className="border rounded-lg p-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">People</div>
              <div># People Needed: {peopleNeeded}</div>
              <div>Committed Volunteers: {peopleCommitted}</div>
              <div>Remaining Volunteers: {peopleRemaining}</div>
            </div>
          </div>

          <div className="border rounded-lg p-2 mb-3 text-sm">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Categories</div>
            <div className="grid gap-2">
              {(request.categories || []).map((category) => (
                <div key={category} className="rounded-lg bg-red-50 px-2 py-1.5 text-xs">
                  <div className="font-bold text-red-700">
                    {getRequestCategoryLabel(category)}
                  </div>
                  <div className="mt-1 leading-snug text-[#667085]">
                    {categoryDescriptions[category] || ""}
                  </div>
                </div>
              ))}
              {(request.categories || []).length === 0 && <span>Not provided</span>}
            </div>
          </div>

          <div className="border rounded-lg p-2 mb-3 text-sm">
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">Need / Request Description</div>
            <div className="whitespace-pre-wrap">{request.need || "No details provided"}</div>
          </div>

          {request.peopleNeededComment && (
            <div className="border rounded-lg p-2 mb-3 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">
                Additional People Comment
              </div>
              <div className="whitespace-pre-wrap">{request.peopleNeededComment}</div>
              {request.updatedByName && (
                <div className="mt-1 text-xs text-[#667085]">
                  Updated by {request.updatedByName}
                </div>
              )}
            </div>
          )}

          {(request.categories || []).includes(REQUEST_MEAL_CATEGORY) && (
            <div className="border rounded-lg p-2 mb-3 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Food Allergies</div>
              <div className="whitespace-pre-wrap">
                {request.hasFoodAllergies
                  ? request.foodAllergies || "Food allergies were indicated, but details were not provided."
                  : "No food allergies indicated."}
              </div>
            </div>
          )}

          {(request.claimCommitments || []).length > 0 && (
            <details className="border rounded-lg mb-3 text-sm">
              <summary className="cursor-pointer p-2 text-xs font-bold text-gray-500 uppercase">Volunteer Commitments ({(request.claimCommitments || []).length})</summary>
              <div className="border-t p-2 space-y-2">
                {(request.claimCommitments || []).map((claim) => {
                  const claimantContact = contactsByUid.get(claim.uid);

                  return (
                  <div key={`${claim.uid}-${claim.claimedAt}`} className="bg-blue-50 text-blue-800 p-2 rounded-lg">
                    <div className="font-bold">{claim.name}</div>
                    <div>{claim.peopleProvided} people</div>
                    {canViewContactInfo && (claimantContact?.phone || claim.phone) && (
                      <div>Phone: {formatPhoneNumber(claimantContact?.phone || claim.phone)}</div>
                    )}
                    {canViewContactInfo && (claimantContact?.email || claim.email) && (
                      <div>Email: {claimantContact?.email || claim.email}</div>
                    )}
                    {claim.mealPreparationLocationName && (
                      <div className="mt-1">
                        <span className="font-semibold">Meal preparation location:</span>{" "}
                        {claim.mealPreparationLocationName}
                        {claim.mealPreparationLocationAddress
                          ? `, ${claim.mealPreparationLocationAddress}`
                          : ""}
                      </div>
                    )}
                    {claim.comment && <div>Comment: {claim.comment}</div>}
                    {claim.claimedAt && <div className="text-xs mt-1">Volunteered: {formatDateTime(claim.claimedAt) || "Not recorded"}</div>}
                  </div>
                  );
                })}
              </div>
            </details>
          )}

          <details className="border rounded-lg mb-3 text-sm">
            <summary className="cursor-pointer p-2 text-xs font-bold text-gray-500 uppercase">Request History ({sortedHistory.length})</summary>
            <div className="border-t p-2">
            {sortedHistory.length === 0 ? (
              <div className="text-[#667085]">No history recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {sortedHistory.map((item) => (
                  <div key={item.id || `${item.action}-${item.createdAt?.seconds || item.createdAt || ""}`} className="rounded-lg bg-[#f8fafc] border border-[#e4e7ec] p-2">
                    <div className="font-bold text-[#172033]">
                      {formatHistoryAction(item.action)}
                    </div>
                    <div className="text-[#475467]">
                      By: {item.byName || item.byEmail || "Unknown"}
                    </div>
                    <div className="text-[#667085]">
                      When: {formatDateTime(item.createdAt || item.timestamp) || "Unknown time"}
                    </div>
                    {item.details && (
                      <div className="mt-2 whitespace-pre-wrap text-[#475467]">
                        {item.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </details>

          {request.completionComment && (
            <div className="border rounded-lg p-2 mb-3 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Completion Comment</div>
              <div>{request.completionComment}</div>
            </div>
          )}

          {request.cancellationReason && (
            <div className="border rounded-lg p-2 text-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Cancellation Reason</div>
              <div>{request.cancellationReason}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestCard({
  request,
  user,
  users = [],
  requestHistory = [],
  onEdit,
  openAction = null,
  actionToken = null,
  onActionHandled,
  renderRow = true
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimPeople, setClaimPeople] = useState("1");
  const [claimComment, setClaimComment] = useState("");
  const [claimHelperUid, setClaimHelperUid] = useState(user.uid);
  const [mealPreparationLocationUid, setMealPreparationLocationUid] = useState("");
  const [requestContacts, setRequestContacts] = useState(null);

  const isOwner = request.residentUid === user.uid;
  const isClaimedByCurrentUser = (request.claimCommitments || []).some((claim) => claim.uid === user.uid);
  const isAdmin = user.role === "admin";
  const canViewRequestContacts =
    user.teamMember === true || isOwner || isClaimedByCurrentUser;
  const canEditRequest = isOwner || isAdmin || isClaimedByCurrentUser;
  const canCancelRequest = isOwner || isAdmin;
  const eligibleHelpers = users
    .filter((u) =>
      u.active !== false &&
      u.approved !== false &&
      (request.restrictedToTeam !== true || u.teamMember === true)
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const selectedHelper = isAdmin
    ? eligibleHelpers.find((helper) => helper.uid === claimHelperUid || helper.id === claimHelperUid) || user
    : user;
  const mealPreparationLocations = users
    .filter(
      (location) =>
        location.active !== false &&
        location.approved !== false &&
        location.mealPreparationLocation === true
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const selectedMealPreparationLocation = mealPreparationLocations.find(
    (location) => (location.uid || location.id) === mealPreparationLocationUid
  );

  const peopleNeeded = normalizePeopleNeeded(request.peopleNeeded);
  const peopleCommitted = getPeopleCommitted(request);
  const peopleRemaining = getPeopleRemaining(request);
  const claimedBy = getClaimedBy(request);
  const canClaim =
    !isOwner &&
    isOpenRequestStatus(request.status) &&
    !isClaimedByCurrentUser &&
    (request.restrictedToTeam !== true || user.teamMember === true);
  const isDonateDishRequest = (request.categories || []).includes(REQUEST_MEAL_CATEGORY);
  const allergyText = request.hasFoodAllergies
    ? request.foodAllergies || "Food allergies were indicated, but details were not provided."
    : "";
  const thisRequestHistory = requestHistory.filter((item) => item.requestId === request.id);
  const statusDateMeta = getStatusDateMeta(request);
  const statusDateTime = formatDateTime(statusDateMeta.value);
  const displayStatus = getRequestDisplayStatus(request);

  useEffect(() => {
    if (!openAction || !actionToken) return;

    if (openAction === "details") {
      setShowDetails(true);
    }

    if (openAction === "claim" && canClaim) {
      setShowClaimForm(true);
    }

    onActionHandled?.();
  }, [actionToken, canClaim, onActionHandled, openAction]);

  useEffect(() => {
    if (!showDetails || !canViewRequestContacts || requestContacts) return;

    let cancelled = false;

    auth.currentUser?.getIdToken()
      .then((token) =>
        fetch(`/api/request-contacts?requestId=${encodeURIComponent(request.id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      )
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Unable to load contact information.");
        if (!cancelled) setRequestContacts(body);
      })
      .catch((error) => {
        console.error("Request contacts error:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [canViewRequestContacts, request.id, requestContacts, showDetails]);

  const claimRequest = async () => {
    if (request.restrictedToTeam === true && user.teamMember !== true) {
      alert("Only Hurricane Hearts Team Members can volunteer for meal requests.");
      return;
    }

    if (request.restrictedToTeam === true && selectedHelper.teamMember !== true) {
      alert("Only Hurricane Hearts Team Members can volunteer for meal requests.");
      return;
    }

    if (isDonateDishRequest && !selectedMealPreparationLocation) {
      alert("Please select a meal preparation location.");
      return;
    }

    if (!isAdmin && request.residentUid === user.uid) {
      alert("You cannot volunteer for your own request.");
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

    if (!claimComment.trim()) {
      alert("A short volunteer comment is required.");
      return;
    }

    const requestRef = doc(db, "requests", request.id);
    const freshSnap = await getDoc(requestRef);

    if (!freshSnap.exists()) {
      alert("This request no longer exists.");
      return;
    }

    const fresh = { id: freshSnap.id, ...freshSnap.data() };
    const freshClaims = sanitizeClaims(fresh.claimCommitments);

    if (freshClaims.some((claim) => claim.uid === (selectedHelper.uid || selectedHelper.id))) {
      alert("This helper has already volunteered for this request.");
      return;
    }

    const newClaim = {
      uid: selectedHelper.uid || selectedHelper.id,
      name: selectedHelper.name || selectedHelper.email || "User",
      claimedByUid: user.uid,
      claimedByName: user.name || user.email || "User",
      claimedOnBehalf: isAdmin && (selectedHelper.uid || selectedHelper.id) !== user.uid,
      mealPreparationLocationUid: isDonateDishRequest
        ? selectedMealPreparationLocation.uid || selectedMealPreparationLocation.id
        : "",
      mealPreparationLocationName: isDonateDishRequest
        ? selectedMealPreparationLocation.name || "Meal Preparation Location"
        : "",
      mealPreparationLocationAddress: isDonateDishRequest
        ? formatAddress(selectedMealPreparationLocation)
        : "",
      peopleProvided,
      comment: claimComment.trim(),
      claimedAt: new Date().toISOString()
    };

    const nextClaims = [...freshClaims, newClaim];
    const nextCommitted = nextClaims.reduce((sum, claim) => sum + Number(claim.peopleProvided || 0), 0);
    const nextRemaining = Math.max(
      normalizePeopleNeeded(fresh.peopleNeeded) - nextCommitted,
      0
    );
    const nextStatus =
      nextRemaining === 0
        ? "Assigned"
        : fresh.status === "Re-Opened"
          ? "Re-Opened"
          : "Open";

    await updateDoc(requestRef, {
      claimCommitments: nextClaims,
      claimantUids: nextClaims.map((claim) => claim.uid).filter(Boolean),
      peopleCommitted: nextCommitted,
      peopleRemaining: nextRemaining,
      status: nextStatus,
      assignedHelper: nextClaims.map((claim) => claim.name).join(", "),
      assignedHelperUid: nextClaims[0]?.uid || null,
      assignedHelperPhone: deleteField(),
      assignedHelperEmail: deleteField(),
      residentEmail: deleteField(),
      residentPhone: deleteField(),
      residentAddress: deleteField()
    });

    await addRequestHistory({
      requestId: request.id,
      eventId: request.eventId || "",
      action: "claimed",
      user,
      restrictedToTeam: request.restrictedToTeam === true,
      details: isAdmin && (selectedHelper.uid || selectedHelper.id) !== user.uid
        ? `${user.name || user.email || "Admin"} recorded ${peopleProvided} committed volunteers on behalf of ${selectedHelper.name || selectedHelper.email || "helper"}.${isDonateDishRequest ? ` Meal preparation location: ${newClaim.mealPreparationLocationName}, ${newClaim.mealPreparationLocationAddress}.` : ""} Comment: ${claimComment.trim()}`
        : `${user.name || user.email || "User"} volunteered with ${peopleProvided} people.${isDonateDishRequest ? ` Meal preparation location: ${newClaim.mealPreparationLocationName}, ${newClaim.mealPreparationLocationAddress}.` : ""} Comment: ${claimComment.trim()}`
    });

    await addNotification({
      toUid: request.residentUid,
      type: "request_claimed",
      title: "Volunteers committed to your request",
      message: `${selectedHelper.name || selectedHelper.email || "A resident"} committed ${peopleProvided} people. ${nextRemaining} more needed.`,
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
      console.error("Request volunteer email error:", error);
    });

    setShowClaimForm(false);
    setClaimPeople("1");
    setClaimComment("");
    setClaimHelperUid(user.uid);
    setMealPreparationLocationUid("");
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
      claimCommitments: sanitizeClaims(request.claimCommitments),
      completionComment: completionComment.trim(),
      completedAt: new Date().toISOString(),
      completedByUid: user.uid,
      completedByName: user.name || user.email || "User",
      residentEmail: deleteField(),
      residentPhone: deleteField(),
      residentAddress: deleteField(),
      assignedHelperPhone: deleteField(),
      assignedHelperEmail: deleteField()
    });

    await addRequestHistory({
      requestId: request.id,
      eventId: request.eventId || "",
      action: "completed",
      user,
      restrictedToTeam: request.restrictedToTeam === true,
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
      claimCommitments: sanitizeClaims(request.claimCommitments),
      cancellationReason: reason.trim(),
      cancelledAt: new Date().toISOString(),
      cancelledByUid: user.uid,
      cancelledByName: user.name || user.email || "User",
      residentEmail: deleteField(),
      residentPhone: deleteField(),
      residentAddress: deleteField(),
      assignedHelperPhone: deleteField(),
      assignedHelperEmail: deleteField()
    });

    await addRequestHistory({
      requestId: request.id,
      eventId: request.eventId || "",
      action: "cancelled",
      user,
      restrictedToTeam: request.restrictedToTeam === true,
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
      {renderRow && (
        <tr
          className={classNames(
            "align-top",
            isDonateDishRequest
              ? "bg-[#fffbeb] hover:bg-[#fef3c7]"
              : "hover:bg-[#f1f5f9]"
          )}
        >
        <td className="px-2 py-2 text-xs text-[#475467] whitespace-nowrap">
          <div>{formatDateTime(request.createdAt) || "Not recorded"}</div>
          {displayStatus === "Re-Opened" && (
            <div className="mt-1 font-semibold text-[#92400e]">
              Re-open: {formatDateTime(request.reopenedAt || request.updatedAt) || "Not recorded"}
            </div>
          )}
        </td>

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
                {getRequestCategoryLabel(category)}
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

        <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
          <div>N: {peopleNeeded}</div>
          <div>C: {peopleCommitted}</div>
          <div>R: {peopleRemaining}</div>
        </td>

        <td className="px-2 py-2">
          <span
            className={classNames(
              "inline-flex px-2 py-1 rounded-full text-xs font-bold",
              getRequestStatusClass(displayStatus)
            )}
          >
            {displayStatus}
          </span>
          <div className="mt-1 text-[11px] leading-tight text-[#667085]">
            <div>{statusDateMeta.label}</div>
            <div>{statusDateTime || "Not recorded"}</div>
          </div>
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
                {isClaimedByCurrentUser && !isOwner && !isAdmin
                  ? "Update Needed"
                  : "Edit"}
              </button>
            )}

            {canCancelRequest && request.status !== "Cancelled" && request.status !== "Completed" && (
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
                Volunteer
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
      )}

      {showDetails &&
        createPortal(
          <RequestDetailsModal
            request={request}
            requestHistory={thisRequestHistory}
            contactData={requestContacts}
            canViewContactInfo={canViewRequestContacts}
            peopleNeeded={peopleNeeded}
            peopleCommitted={peopleCommitted}
            peopleRemaining={peopleRemaining}
            onClose={() => setShowDetails(false)}
          />,
          document.body
        )}

      {showClaimForm &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white border border-[#c7d0dc] rounded-xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
              <div className="p-3 sm:p-4">
              <h2 className="text-lg font-bold mb-1">Volunteer for Request</h2>
              <p className="text-xs text-[#667085] mb-3">
                Select the number of people you can provide and add a short comment.
              </p>

              <div className="mb-3 rounded-lg border border-[#d8e0ea] bg-[#f8fafc] px-3 py-2">
                <div className="mb-1 text-[11px] font-bold uppercase text-[#667085]">
                  Categories
                </div>
                <div className="flex flex-wrap gap-1">
                  {(request.categories || []).map((category) => (
                    <span
                      key={category}
                      className="rounded-md border border-[#fecdca] bg-[#fff1f0] px-2 py-1 text-xs font-semibold text-[#b42318]"
                    >
                      {getRequestCategoryLabel(category)}
                    </span>
                  ))}
                  {(request.categories || []).length === 0 && (
                    <span className="text-xs text-[#667085]">Not provided</span>
                  )}
                </div>
              </div>

              {isDonateDishRequest && (
                <>
                  <div
                    className={
                      request.hasFoodAllergies
                        ? "mb-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-xs text-[#9a3412]"
                        : "mb-3 rounded-lg border border-[#c7d0dc] bg-[#f8fafc] px-3 py-2 text-xs text-[#475467]"
                    }
                  >
                    <div className="font-bold">Food Allergies</div>
                    <div className="whitespace-pre-wrap">
                      {request.hasFoodAllergies
                        ? allergyText
                        : "No food allergies indicated."}
                    </div>
                  </div>

                  <label className="block text-xs font-semibold mb-1">
                    Meal Preparation Location
                  </label>
                  <select
                    value={mealPreparationLocationUid}
                    onChange={(e) => setMealPreparationLocationUid(e.target.value)}
                    className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 mb-3 bg-white text-sm"
                  >
                    <option value="">Select a preparation location</option>
                    {mealPreparationLocations.map((location) => (
                      <option
                        key={location.uid || location.id}
                        value={location.uid || location.id}
                      >
                        {location.name || "Unnamed Location"} - {formatAddress(location)}
                      </option>
                    ))}
                  </select>
                  {mealPreparationLocations.length === 0 && (
                    <p className="mb-3 text-xs font-semibold text-[#b42318]">
                      No meal preparation locations are currently designated. A Super Admin must designate one before someone can volunteer for this request.
                    </p>
                  )}
                </>
              )}

              {isAdmin && (
                <>
                  <label className="block text-xs font-semibold mb-1">
                    Volunteer On Behalf Of
                  </label>
                  <select
                    value={claimHelperUid}
                    onChange={(e) => setClaimHelperUid(e.target.value)}
                    className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 mb-3 bg-white text-sm"
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

              <label className="block text-xs font-semibold mb-1">
                Number of People
              </label>
              <select
                value={claimPeople}
                onChange={(e) => setClaimPeople(e.target.value)}
                className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 mb-3 bg-white text-sm"
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
                  <option key={number} value={number}>{number}</option>
                ))}
              </select>

              <label className="block text-xs font-semibold mb-1">
                Comment
              </label>
              <textarea
                value={claimComment}
                onChange={(e) => setClaimComment(e.target.value)}
                placeholder="Example: I can bring two people and hand tools."
                className="w-full border border-[#c7d0dc] rounded-lg px-3 py-2 min-h-[58px] mb-3 text-sm"
              />
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[#e4e7ec] bg-white px-3 py-2 sm:px-4">
                <button
                  onClick={() => {
                    setShowClaimForm(false);
                    setClaimPeople("1");
                    setClaimComment("");
                    setClaimHelperUid(user.uid);
                    setMealPreparationLocationUid("");
                  }}
                  className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={claimRequest}
                  className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Submit Volunteer Commitment
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
