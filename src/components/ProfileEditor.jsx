import { useState } from "react";
import { formatAddress, getAddressParts, isAddressComplete } from "../utils/addressFields";
import { formatPhoneNumber, normalizePhoneNumber } from "../utils/formatPhoneNumber";
import { getLoginIdMessage, isValidLoginId } from "../utils/loginId";
import { requestCategoryGroups } from "../utils/requestCategories";

export default function ProfileEditor({
  title = "Edit Profile",
  user,
  adminMode = false,
  canManageAdminRole = true,
  scrollInside = false,
  onSave,
  onDelete,
  onCancel
}) {
  const PRIMARY_OWNER_EMAIL = "hurricanehearts.admin@gmail.com";
  const isPrimaryOwner = user.email === PRIMARY_OWNER_EMAIL;
  const canEditRole = canManageAdminRole || isPrimaryOwner;
  const canManageTeamMember = adminMode && canManageAdminRole;
  const canDeleteUser = Boolean(adminMode && onDelete && user.id && !isPrimaryOwner);
  const canEditLoginId = adminMode && canManageAdminRole && Boolean(user.id);
  const addressVerificationFailed = user.addressVerificationOverride === true;
  const addressManuallyReviewed = user.addressManuallyReviewed === true;
  const needsAddressReview =
    addressVerificationFailed && !addressManuallyReviewed;

  const [form, setForm] = useState({
    ...user,
    ...getAddressParts(user),
    name: user.name || "",
    email: user.email || "",
    loginId: user.loginId || "",
    loginIdKey: user.loginIdKey || "",
    phone: formatPhoneNumber(user.phone || ""),
    role: isPrimaryOwner ? "admin" : user.role || "resident",
    approved: isPrimaryOwner ? true : user.approved ?? true,
    active: isPrimaryOwner ? true : user.active ?? true,
    serviceCategories: user.serviceCategories || [],
    teamMember: user.teamMember || false,
    managedCategories: user.managedCategories || []
  });
  const [newPassword, setNewPassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [addressReviewComment, setAddressReviewComment] = useState(
    user.addressReviewComment || ""
  );

  const toggleServiceCategory = (category) => {
    setForm((current) => {
      const selected = current.serviceCategories.includes(category);

      return {
        ...current,
        serviceCategories: selected
          ? current.serviceCategories.filter((item) => item !== category)
          : [...current.serviceCategories, category]
      };
    });
  };

  const toggleManagedCategory = (category) => {
    setForm((current) => {
      const selected = current.managedCategories.includes(category);

      return {
        ...current,
        managedCategories: selected
          ? current.managedCategories.filter((item) => item !== category)
          : [...current.managedCategories, category]
      };
    });
  };

  const save = async () => {
    const hasProfileEmail = form.hasEmail !== false || Boolean(form.email.trim());

    if (!form.name.trim() || (hasProfileEmail && !form.email.trim()) || !isAddressComplete(form) || !form.phone.trim()) {
      alert(
        hasProfileEmail
          ? "Please complete name, email, house number, street name, city, zip, AR lot number, and phone."
          : "Please complete name, house number, street name, city, zip, AR lot number, and phone."
      );
      return;
    }

    if (newPassword && newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (canEditLoginId && form.loginId.trim() && !isValidLoginId(form.loginId)) {
      alert(getLoginIdMessage());
      return;
    }

    if (
      needsAddressReview &&
      form.approved !== false &&
      addressReviewComment.trim().length < 4
    ) {
      alert("Please enter an address review comment before approving this user.");
      return;
    }

    await onSave({
      ...form,
      newPassword: newPassword || "",
      addressReviewComment: addressReviewComment.trim(),
      email: isPrimaryOwner ? PRIMARY_OWNER_EMAIL : form.email,
      hasEmail: hasProfileEmail,
      loginId: form.loginId.trim(),
      houseNumber: form.houseNumber.trim(),
      streetName: form.streetName.trim(),
      city: form.city.trim(),
      zip: form.zip.trim(),
      arLotNumber: form.arLotNumber.trim(),
      address: formatAddress(form),
      phone: normalizePhoneNumber(form.phone),
      role: isPrimaryOwner ? "admin" : form.role,
      approved: isPrimaryOwner ? true : form.approved,
      active: isPrimaryOwner ? true : form.active,
      teamMember: canManageTeamMember ? form.teamMember : user.teamMember || false,
      managedCategories:
        canManageTeamMember || user.teamMember
          ? form.managedCategories || []
          : user.managedCategories || []
    });
  };

  const requestDelete = async () => {
    const cleanReason = deleteReason.trim();

    if (cleanReason.length < 4) {
      alert("Please enter a short reason before deleting this account.");
      return;
    }

    const name = form.name || form.email || "this user";
    const confirmed = window.confirm(
      `Delete ${name}'s user account?\n\nReason: ${cleanReason}\n\nThis removes both the app profile and Firebase Authentication login when one exists.`
    );

    if (!confirmed) return;

    await onDelete({
      ...user,
      ...form,
      deleteReason: cleanReason
    });
  };

  return (
    <div
      className={
        scrollInside
          ? "bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-6 max-h-[calc(100vh-9rem)] overflow-y-auto overscroll-contain"
          : "bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-6"
      }
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[#172033]">{title}</h3>
      </div>

      {addressVerificationFailed && (
        <div
          className={
            needsAddressReview
              ? "mb-5 rounded-lg border-2 border-[#f79009] bg-[#fffbeb] p-4 text-sm text-[#7a2e0e]"
              : "mb-5 rounded-lg border border-[#abefc6] bg-[#ecfdf3] p-4 text-sm text-[#05603a]"
          }
        >
          <div
            className={
              needsAddressReview
                ? "text-base font-bold text-[#b54708]"
                : "text-base font-bold text-[#067647]"
            }
          >
            {needsAddressReview
              ? "Address Requires Admin Review"
              : "Address Verification Failed - Manually Reviewed"}
          </div>
          <p className="mt-1">
            This resident submitted an address that did not match the uploaded directory.
          </p>
          {user.addressVerificationOverrideNote && (
            <p className="mt-2 font-semibold">
              Resident note: {user.addressVerificationOverrideNote}
            </p>
          )}
          {addressManuallyReviewed && user.addressReviewComment && (
            <p className="mt-2 font-semibold">
              Admin review comment: {user.addressReviewComment}
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm font-semibold text-[#172033]">
          Full name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            className="mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
          />
        </label>

        <label className="text-sm font-semibold text-[#172033]">
          Email
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={form.hasEmail === false ? "No email on file" : "Email"}
            disabled={isPrimaryOwner}
            className={
              isPrimaryOwner
                ? "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-[#e2e8f0] text-[#667085] font-normal"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            }
          />
        </label>

        <label className="text-sm font-semibold text-[#172033]">
          User ID
          <input
            value={form.loginId}
            onChange={(e) => setForm({ ...form, loginId: e.target.value })}
            placeholder={canEditLoginId ? "Enter User ID" : "Not assigned"}
            disabled={!canEditLoginId}
            className={
              canEditLoginId
                ? "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-[#e2e8f0] text-[#667085] font-normal"
            }
          />
          {canEditLoginId && (
            <span className="mt-1 block text-xs font-normal text-[#667085]">
              {getLoginIdMessage()}
            </span>
          )}
        </label>

        <label className="text-sm font-semibold text-[#172033]">
          Phone
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
            placeholder="Phone"
            className="mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
          />
        </label>

        <label className={needsAddressReview ? "text-sm font-bold text-[#b54708]" : "text-sm font-semibold text-[#172033]"}>
          House number
          <input
            value={form.houseNumber}
            onChange={(e) => setForm({ ...form, houseNumber: e.target.value })}
            placeholder="House number"
            className={
              needsAddressReview
                ? "mt-1 w-full border-2 border-[#f79009] rounded-lg p-3.5 bg-[#fffbeb] font-normal text-[#7a2e0e]"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            }
          />
        </label>

        <label className={needsAddressReview ? "text-sm font-bold text-[#b54708]" : "text-sm font-semibold text-[#172033]"}>
          Street name
          <input
            value={form.streetName}
            onChange={(e) => setForm({ ...form, streetName: e.target.value })}
            placeholder="Street name"
            className={
              needsAddressReview
                ? "mt-1 w-full border-2 border-[#f79009] rounded-lg p-3.5 bg-[#fffbeb] font-normal text-[#7a2e0e]"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            }
          />
        </label>

        <label className={needsAddressReview ? "text-sm font-bold text-[#b54708]" : "text-sm font-semibold text-[#172033]"}>
          City
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="City"
            className={
              needsAddressReview
                ? "mt-1 w-full border-2 border-[#f79009] rounded-lg p-3.5 bg-[#fffbeb] font-normal text-[#7a2e0e]"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            }
          />
        </label>

        <label className={needsAddressReview ? "text-sm font-bold text-[#b54708]" : "text-sm font-semibold text-[#172033]"}>
          Zip
          <input
            value={form.zip}
            onChange={(e) => setForm({ ...form, zip: e.target.value })}
            placeholder="Zip"
            className={
              needsAddressReview
                ? "mt-1 w-full border-2 border-[#f79009] rounded-lg p-3.5 bg-[#fffbeb] font-normal text-[#7a2e0e]"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            }
          />
        </label>

        <label className={needsAddressReview ? "text-sm font-bold text-[#b54708]" : "text-sm font-semibold text-[#172033]"}>
          AR Lot number
          <input
            value={form.arLotNumber}
            onChange={(e) => setForm({ ...form, arLotNumber: e.target.value })}
            placeholder="AR Lot number"
            className={
              needsAddressReview
                ? "mt-1 w-full border-2 border-[#f79009] rounded-lg p-3.5 bg-[#fffbeb] font-normal text-[#7a2e0e]"
                : "mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            }
          />
        </label>
      </div>

      {adminMode && canManageAdminRole && user.id && (
        <div className="bg-[#f8fafc] border border-[#c7d0dc] rounded-lg p-5 mt-5">
          <div className="font-bold text-[#172033] mb-1">Password</div>
          <p className="text-sm text-[#667085] mb-3">
            Existing passwords cannot be viewed. Enter a new password here to replace it.
          </p>

          <label className="block text-sm font-semibold text-[#172033]">
            New password
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full border border-[#c7d0dc] rounded-lg p-3.5 bg-white font-normal"
            />
          </label>
        </div>
      )}

      <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-5 mt-5">
        <div className="font-bold text-[#172033] mb-2">Willing to Help With</div>
        <p className="text-sm text-[#667085] mb-4">
          Check any request categories this user is willing to support.
        </p>

        <div className="space-y-4">
          {requestCategoryGroups.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-bold uppercase text-[#667085] mb-2">
                {group.label}
              </div>

              <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                {group.categories.map((category) => {
                  const selected = form.serviceCategories.includes(category);

                  return (
                    <label
                      key={category}
                      className={
                        selected
                          ? "border border-[#fecdca] bg-[#fff1f0] rounded-lg p-3 flex items-center gap-2 font-semibold cursor-pointer"
                          : "border border-[#c7d0dc] rounded-lg p-3 flex items-center gap-2 bg-white cursor-pointer"
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleServiceCategory(category)}
                      />
                      {category}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(adminMode || form.teamMember) && (
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-5 mt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-bold text-[#172033] mb-1">
                Hurricane Hearts Team Member
              </div>
              <p className="text-sm text-[#475467]">
                Mark which request categories this person coordinates or manages.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-[#172033]">
              <input
                type="checkbox"
                checked={form.teamMember}
                disabled={!canManageTeamMember}
                onChange={(e) =>
                  setForm({
                    ...form,
                    teamMember: e.target.checked,
                    managedCategories: e.target.checked ? form.managedCategories : []
                  })
                }
              />
              Team Member
            </label>
          </div>

          {!canManageTeamMember && !form.teamMember && (
            <p className="text-xs text-[#667085] mt-3">
              Team member designation is restricted to the primary owner.
            </p>
          )}

          {form.teamMember && (
            <div className="space-y-4 mt-4">
              {requestCategoryGroups.map((group) => (
                <div key={group.label}>
                  <div className="text-xs font-bold uppercase text-[#667085] mb-2">
                    {group.label}
                  </div>

                  <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                    {group.categories.map((category) => {
                      const selected = form.managedCategories.includes(category);

                      return (
                        <label
                          key={category}
                          className={
                            selected
                              ? "border border-[#bfdbfe] bg-white rounded-lg p-3 flex items-center gap-2 font-semibold cursor-pointer"
                              : "border border-[#c7d0dc] rounded-lg p-3 flex items-center gap-2 bg-white cursor-pointer"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleManagedCategory(category)}
                          />
                          {category}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {adminMode && (
        <div className="flex flex-wrap gap-4 mt-4">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Role
            <select
              value={form.role || "resident"}
              disabled={isPrimaryOwner || !canEditRole}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={
                isPrimaryOwner || !canEditRole
                  ? "border border-[#c7d0dc] rounded-lg px-3 py-2 bg-[#e2e8f0] text-[#667085]"
                  : "border border-[#c7d0dc] rounded-lg px-3 py-2 bg-white"
              }
            >
              <option value="resident">Resident</option>
              <option value="admin">Admin</option>
            </select>

            {isPrimaryOwner && (
              <span className="text-xs text-[#667085]">
                Primary admin must remain approved, active, and Admin.
              </span>
            )}
            {!isPrimaryOwner && !canEditRole && (
              <span className="text-xs text-[#667085]">
                Admin role changes are restricted to the primary owner.
              </span>
            )}
          </label>

          {needsAddressReview && (
            <label className="basis-full text-sm font-bold text-[#b54708]">
              Address review comment required before approval
              <textarea
                value={addressReviewComment}
                onChange={(e) => setAddressReviewComment(e.target.value)}
                placeholder="Example: verified by phone with resident, corrected lot number, or approved after manual review"
                rows={3}
                className="mt-1 w-full rounded-lg border-2 border-[#f79009] bg-[#fffbeb] p-3 text-sm font-normal text-[#7a2e0e]"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold mt-6">
            <input
              type="checkbox"
              checked={form.approved !== false}
              disabled={isPrimaryOwner}
              onChange={(e) => setForm({ ...form, approved: e.target.checked })}
            />
            Approved
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold mt-6">
            <input
              type="checkbox"
              checked={form.active !== false}
              disabled={isPrimaryOwner}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>
        </div>
      )}

      {canDeleteUser && (
        <div className="mt-5 rounded-lg border border-[#fecdca] bg-[#fff1f0] p-4">
          <div className="font-bold text-[#b42318]">Delete User Account</div>
          <p className="mt-1 text-sm text-[#475467]">
            Deleting removes this profile and the matching login account when one exists.
          </p>

          <label className="mt-3 block text-sm font-semibold text-[#172033]">
            Reason for deletion
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Enter a short reason"
              rows={2}
              className="mt-1 w-full rounded-lg border border-[#fecdca] bg-white p-3 text-sm font-normal text-[#172033]"
            />
          </label>

          <button
            type="button"
            onClick={requestDelete}
            className="mt-3 rounded-lg bg-[#b42318] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9f1f16]"
          >
            Delete User
          </button>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          onClick={save}
          className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-4 py-2.5 rounded-lg font-semibold"
        >
          Save
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-4 py-2.5 rounded-lg font-semibold"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
