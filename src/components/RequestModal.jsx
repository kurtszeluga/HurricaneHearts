import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { formatAddress } from "../utils/addressFields";
import { formatDateOnly } from "../utils/formatDate";
import {
  assistanceRequestCategoryGroups,
  categoryDescriptions,
  getRequestCategoryLabel,
  REQUEST_MEAL_CATEGORY
} from "../utils/requestCategories";

const peopleNeededOptions = ["Unknown", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

async function addRequestHistory({
  requestId,
  action,
  user,
  details = "",
  eventId = "",
  restrictedToTeam = false
}) {
  await addDoc(collection(db, "requestHistory"), {
    requestId,
    eventId,
    action,
    details,
    byUid: user.uid,
    byName: user.name || user.email || "User",
    byEmail: user.email || "",
    restrictedToTeam,
    createdAt: serverTimestamp()
  });
}

async function addNotification({ toUid, type, title, message, requestId, eventId }) {
  if (!toUid) return;

  await addDoc(collection(db, "notifications"), {
    toUid,
    type,
    title,
    message,
    requestId: requestId || "",
    eventId: eventId || "",
    read: false,
    createdAt: serverTimestamp()
  });
}

export default function RequestModal({ open, onClose, user, editingRequest = null, activeEvent = null, users = [] }) {
  const isAdmin = user.role === "admin";
  const eligibleResidents = users
    .filter((u) => u.active !== false && u.approved !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const [form, setForm] = useState({
    categories: [],
    hasFoodAllergies: false,
    foodAllergies: "",
    need: "",
    urgency: "Medium",
    peopleNeeded: "Unknown",
    requestorUid: user.uid
  });

  const isEditing = Boolean(editingRequest);

  useEffect(() => {
    if (!open) return;

    if (editingRequest) {
      // Reset the modal form whenever it opens for a new request context.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        categories: editingRequest.categories || [],
        hasFoodAllergies: editingRequest.hasFoodAllergies || false,
        foodAllergies: editingRequest.foodAllergies || "",
        need: editingRequest.need || "",
        urgency: editingRequest.urgency || "Medium",
        peopleNeeded: editingRequest.peopleNeeded?.toString() || "Unknown",
        requestorUid: editingRequest.residentUid || user.uid
      });
    } else {
      setForm({
        categories: [],
        hasFoodAllergies: false,
        foodAllergies: "",
        need: "",
        urgency: "Medium",
        peopleNeeded: "Unknown",
        requestorUid: user.uid
      });
    }
  }, [open, editingRequest, user.uid]);

  if (!open) return null;

  const toggleCategory = (category) => {
    setForm((current) => {
      const selected = current.categories.includes(category);
      const nextCategories = selected
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category];
      const includesDonateDish = nextCategories.includes(REQUEST_MEAL_CATEGORY);

      return {
        ...current,
        categories: nextCategories,
        hasFoodAllergies: includesDonateDish ? current.hasFoodAllergies : false,
        foodAllergies: includesDonateDish ? current.foodAllergies : ""
      };
    });
  };

  const normalizedPeopleNeeded = form.peopleNeeded === "Unknown"
    ? "Unknown"
    : Number(form.peopleNeeded);
  const includesDonateDish = form.categories.includes(REQUEST_MEAL_CATEGORY);
  const restrictedToTeam = includesDonateDish;
  const cleanFoodAllergies = includesDonateDish && form.hasFoodAllergies
    ? form.foodAllergies.trim()
    : "";

  const selectedRequestor = isAdmin
    ? eligibleResidents.find((resident) => resident.uid === form.requestorUid || resident.id === form.requestorUid) || user
    : user;

  const submit = async () => {
    if (!isEditing && !activeEvent) {
      alert("Requests can only be submitted while an event is active.");
      return;
    }

    if (isAdmin && !selectedRequestor) {
      alert("Please select the resident this request is for.");
      return;
    }

    if (form.categories.length === 0) {
      alert("Please select at least one request category.");
      return;
    }

    if (!form.need.trim()) {
      alert("Please describe what help is needed.");
      return;
    }

    if (includesDonateDish && form.hasFoodAllergies && !cleanFoodAllergies) {
      alert("Please enter the food allergy information.");
      return;
    }

    if (isEditing) {
      const existingPeopleCommitted = editingRequest.peopleCommitted || 0;
      const nextStatus =
        normalizedPeopleNeeded !== "Unknown" && existingPeopleCommitted >= normalizedPeopleNeeded
          ? "Assigned"
          : editingRequest.status === "Assigned" && normalizedPeopleNeeded !== "Unknown" && existingPeopleCommitted < normalizedPeopleNeeded
            ? "Open"
            : editingRequest.status;

      await updateDoc(doc(db, "requests", editingRequest.id), {
        categories: form.categories,
        restrictedToTeam,
        hasFoodAllergies: includesDonateDish ? form.hasFoodAllergies : false,
        foodAllergies: cleanFoodAllergies,
        need: form.need,
        urgency: form.urgency,
        peopleNeeded: normalizedPeopleNeeded,
        peopleRemaining:
          normalizedPeopleNeeded === "Unknown"
            ? "Unknown"
            : Math.max(normalizedPeopleNeeded - existingPeopleCommitted, 0),
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
        updatedByName: user.name || user.email || "User"
      });

      await addRequestHistory({
        requestId: editingRequest.id,
        eventId: editingRequest.eventId || "",
        action: "edited",
        user,
        restrictedToTeam,
        details: `Request details were updated. People needed: ${normalizedPeopleNeeded}.`
      });

      if (editingRequest.residentUid !== user.uid) {
        await addNotification({
          toUid: editingRequest.residentUid,
          type: "request_edited",
          title: "Your request was edited",
          message: `${user.name || user.email || "An admin"} updated your request.`,
          requestId: editingRequest.id,
          eventId: editingRequest.eventId || ""
        });
      }
    } else {
      const requestRef = await addDoc(collection(db, "requests"), {
        eventId: activeEvent.eventId,
        eventName: activeEvent.eventName,
        eventDate: activeEvent.eventDate,
        categories: form.categories,
        restrictedToTeam,
        hasFoodAllergies: includesDonateDish ? form.hasFoodAllergies : false,
        foodAllergies: cleanFoodAllergies,
        need: form.need,
        urgency: form.urgency,
        peopleNeeded: normalizedPeopleNeeded,
        peopleCommitted: 0,
        peopleRemaining: normalizedPeopleNeeded === "Unknown" ? "Unknown" : normalizedPeopleNeeded,
        claimCommitments: [],
        residentName:
          selectedRequestor.name ||
          selectedRequestor.displayName ||
          selectedRequestor.email?.split("@")[0] ||
          "Resident",
        residentEmail: selectedRequestor.email || "",
        residentPhone: selectedRequestor.phone || "",
        residentAddress: formatAddress(selectedRequestor),
        residentUid: selectedRequestor.uid || selectedRequestor.id,
        status: "Open",
        assignedHelper: null,
        assignedHelperUid: null,
        assignedHelperPhone: null,
        assignedHelperEmail: null,
        createdAt: serverTimestamp()
      });

      await addRequestHistory({
        requestId: requestRef.id,
        eventId: activeEvent.eventId,
        action: "created",
        user,
        restrictedToTeam,
        details: isAdmin && (selectedRequestor.uid || selectedRequestor.id) !== user.uid
          ? `Request was created by ${user.name || user.email || "Admin"} on behalf of ${selectedRequestor.name || selectedRequestor.email || "resident"} for ${activeEvent.eventName}. People needed: ${normalizedPeopleNeeded}.`
          : `Request was created for ${activeEvent.eventName}. People needed: ${normalizedPeopleNeeded}.`
      });
    }

    setForm({
      categories: [],
      hasFoodAllergies: false,
      foodAllergies: "",
      need: "",
      urgency: "Medium",
      peopleNeeded: "Unknown"
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#c7d0dc] rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#172033] mb-2">
          {isEditing ? "Edit Request" : "Request Assistance"}
        </h2>

        {!isEditing && activeEvent && (
          <div className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] rounded-lg p-4 mb-5 text-sm font-semibold">
            Active Event: {activeEvent.eventName} — {formatDateOnly(activeEvent.eventDate)}
          </div>
        )}

        {isAdmin && !isEditing && (
          <div className="mb-5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-4">
            <label className="block font-semibold mb-2">
              Submit Request On Behalf Of
            </label>
            <select
              value={form.requestorUid}
              onChange={(e) => setForm({ ...form, requestorUid: e.target.value })}
              className="w-full border border-[#c7d0dc] rounded-lg p-3 bg-white"
            >
              <option value={user.uid}>Myself</option>
              {eligibleResidents.map((resident) => (
                <option key={resident.uid || resident.id} value={resident.uid || resident.id}>
                  {resident.name || resident.email || "Unnamed Resident"}
                </option>
              ))}
            </select>
            <p className="text-xs text-[#1e3a8a] mt-2">
              Use this when a resident cannot enter the request themselves.
            </p>
          </div>
        )}

        <div className="mb-5">
          <div className="font-semibold mb-2">Request Categories</div>
          <p className="text-sm text-[#667085] mb-3">
            Select all categories that apply.
          </p>

          <div className="space-y-4">
            {assistanceRequestCategoryGroups.map((group) => (
              <div key={group.label}>
                <div className="text-sm font-bold uppercase text-[#667085] mb-2">
                  {group.label}
                </div>

                <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                  {group.categories.map((category) => {
                    const selected = form.categories.includes(category);

                    return (
                      <label
                        key={category}
                        className={
                          selected
                            ? "border border-[#fecdca] bg-[#fff1f0] rounded-lg p-3 flex items-center gap-2 font-bold cursor-pointer"
                            : "border border-[#c7d0dc] rounded-lg p-3 flex items-center gap-2 bg-white cursor-pointer"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCategory(category)}
                        />
                        <span className="grid gap-1">
                          <span>{getRequestCategoryLabel(category)}</span>
                          <span className="text-xs font-normal leading-snug text-[#667085]">
                            {categoryDescriptions[category] || ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {includesDonateDish && (
            <div className="mt-4 rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-4">
              <p className="mb-3 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-xs font-semibold leading-snug text-[#1d4ed8]">
                For privacy, this meal request will only be visible to Hurricane Hearts Team Members.
              </p>

              <div className="font-semibold text-[#172033] mb-3">
                Food Allergies
              </div>

              <p className="mb-3 rounded-md border border-[#fecdca] bg-white px-3 py-2 text-xs font-bold leading-snug text-[#b42318]">
                IMPORTANT!! Identify any Allergens in the comments [Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soybean, Sesame]
              </p>

              <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#475467]">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="food-allergies"
                    checked={form.hasFoodAllergies === true}
                    onChange={() =>
                      setForm({
                        ...form,
                        hasFoodAllergies: true
                      })
                    }
                  />
                  Yes
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="food-allergies"
                    checked={form.hasFoodAllergies === false}
                    onChange={() =>
                      setForm({
                        ...form,
                        hasFoodAllergies: false,
                        foodAllergies: ""
                      })
                    }
                  />
                  No
                </label>
              </div>

              {form.hasFoodAllergies && (
                <input
                  value={form.foodAllergies}
                  onChange={(e) => setForm({ ...form, foodAllergies: e.target.value })}
                  placeholder="Example: peanut allergy, no shellfish"
                  className="mt-3 w-full rounded-lg border border-[#fed7aa] bg-white p-3 text-sm"
                />
              )}
            </div>
          )}
        </div>

        <textarea
          value={form.need}
          onChange={(e) => setForm({ ...form, need: e.target.value })}
          placeholder="Describe what help is needed"
          className="w-full border border-[#c7d0dc] rounded-lg p-3.5 min-h-[120px] mb-4"
        />

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <select
            value={form.urgency}
            onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            className="w-full border border-[#c7d0dc] rounded-lg p-3.5"
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>

          <select
            value={form.peopleNeeded}
            onChange={(e) => setForm({ ...form, peopleNeeded: e.target.value })}
            className="w-full border border-[#c7d0dc] rounded-lg p-3.5"
          >
            {peopleNeededOptions.map((option) => (
              <option key={option} value={option}>
                People Needed: {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] font-semibold">
            Cancel
          </button>

          <button onClick={submit} className="px-4 py-2.5 rounded-lg bg-[#b42318] hover:bg-[#9f1f16] text-white font-semibold">
            {isEditing ? "Save Changes" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
