import { useState } from "react";
import { formatPhoneNumber, normalizePhoneNumber } from "../utils/formatPhoneNumber";

const requestCategories = [
  "Wellness Check",
  "Transportation",
  "Food-Water",
  "Adopt A Buddy",
  "Storm Prep",
  "Storm Cleanup",
  "Power-Generator Help",
  "Pet Assistance",
  "Borrow Supplies",
  "Other"
];

export default function ProfileEditor({
  title = "Edit Profile",
  user,
  adminMode = false,
  onSave,
  onCancel
}) {
  const PRIMARY_OWNER_EMAIL = "hurricanehearts.admin@gmail.com";
  const isPrimaryOwner = user.email === PRIMARY_OWNER_EMAIL;

  const [form, setForm] = useState({
    ...user,
    name: user.name || "",
    email: user.email || "",
    address: user.address || "",
    phone: formatPhoneNumber(user.phone || ""),
    role: isPrimaryOwner ? "admin" : user.role || "resident",
    approved: isPrimaryOwner ? true : user.approved ?? true,
    active: isPrimaryOwner ? true : user.active ?? true,
    serviceCategories: user.serviceCategories || []
  });

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

  const save = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.address.trim() || !form.phone.trim()) {
      alert("Please complete name, email, address, and phone.");
      return;
    }

    await onSave({
      ...form,
      phone: normalizePhoneNumber(form.phone),
      role: isPrimaryOwner ? "admin" : form.role,
      approved: isPrimaryOwner ? true : form.approved,
      active: isPrimaryOwner ? true : form.active
    });
  };

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[#172033]">{title}</h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name"
          className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white"
        />

        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white"
        />

        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })}
          placeholder="Phone"
          className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white"
        />

        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Address"
          className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white"
        />
      </div>

      <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-5 mt-5">
        <div className="font-bold text-[#172033] mb-2">Willing to Help With</div>
        <p className="text-sm text-[#667085] mb-4">
          Check any request categories this user is willing to support.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px"
          }}
        >
          {requestCategories.map((category) => {
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

      {adminMode && (
        <div className="flex flex-wrap gap-4 mt-4">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Role
            <select
              value={form.role || "resident"}
              disabled={isPrimaryOwner}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={
                isPrimaryOwner
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
          </label>

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
