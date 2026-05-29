import { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import ProfileEditor from "./ProfileEditor";
import {
  formatPhoneNumber,
  normalizePhoneNumber
} from "../utils/formatPhoneNumber";
import { queueApprovalEmail } from "../utils/emailNotifications";

const PRIMARY_OWNER_EMAIL = "hurricanehearts.admin@gmail.com";

const sortOptions = [
  { label: "Name A-Z", value: "name-asc" },
  { label: "Name Z-A", value: "name-desc" },
  { label: "Email A-Z", value: "email-asc" },
  { label: "Address A-Z", value: "address-asc" },
  { label: "Admins First", value: "admin-first" },
  { label: "Residents First", value: "resident-first" },
  { label: "Approved First", value: "approved-first" },
  { label: "Pending First", value: "pending-first" },
  { label: "Active First", value: "active-first" },
  { label: "Inactive First", value: "inactive-first" }
];

function getUserRole(u) {
  return u.email === PRIMARY_OWNER_EMAIL
    ? "admin"
    : u.role || "resident";
}

export default function AdminPanel({ user, users }) {
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSummaryFilter, setActiveSummaryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = [...users]
      .filter((u) => {
        if (!term) return true;

        return (
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term) ||
          (u.phone || "").toLowerCase().includes(term) ||
          formatPhoneNumber(u.phone || "").toLowerCase().includes(term) ||
          (u.address || "").toLowerCase().includes(term)
        );
      })
      .filter((u) => {
        const approved = u.approved !== false;
        const active = u.active !== false;
        const role = getUserRole(u);

        if (activeSummaryFilter === "Approved") return approved;
        if (activeSummaryFilter === "Pending") return !approved;
        if (activeSummaryFilter === "Active") return active;
        if (activeSummaryFilter === "Inactive") return !active;
        if (activeSummaryFilter === "Admin") return role === "admin";
        if (activeSummaryFilter === "Resident") return role !== "admin";

        return true;
      });

    rows.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      const emailA = (a.email || "").toLowerCase();
      const emailB = (b.email || "").toLowerCase();
      const addressA = (a.address || "").toLowerCase();
      const addressB = (b.address || "").toLowerCase();

      const approvedA = a.approved !== false;
      const approvedB = b.approved !== false;
      const activeA = a.active !== false;
      const activeB = b.active !== false;
      const adminA = getUserRole(a) === "admin";
      const adminB = getUserRole(b) === "admin";

      if (sortBy === "name-asc") return nameA.localeCompare(nameB);
      if (sortBy === "name-desc") return nameB.localeCompare(nameA);
      if (sortBy === "email-asc") return emailA.localeCompare(emailB);
      if (sortBy === "address-asc") return addressA.localeCompare(addressB);
      if (sortBy === "admin-first") return Number(adminB) - Number(adminA);
      if (sortBy === "resident-first") return Number(adminA) - Number(adminB);
      if (sortBy === "approved-first") return Number(approvedB) - Number(approvedA);
      if (sortBy === "pending-first") return Number(approvedA) - Number(approvedB);
      if (sortBy === "active-first") return Number(activeB) - Number(activeA);
      if (sortBy === "inactive-first") return Number(activeA) - Number(activeB);

      return nameA.localeCompare(nameB);
    });

    return rows;
  }, [users, search, activeSummaryFilter, sortBy]);

  const summary = useMemo(() => {
    return {
      approved: users.filter((u) => u.approved !== false).length,
      pending: users.filter((u) => u.approved === false).length,
      active: users.filter((u) => u.active !== false).length,
      inactive: users.filter((u) => u.active === false).length,
      admins: users.filter((u) => getUserRole(u) === "admin").length,
      residents: users.filter((u) => getUserRole(u) !== "admin").length
    };
  }, [users]);

  if (user.role !== "admin") return null;

  const applySummaryFilter = (type) => {
    setSearch("");
    setActiveSummaryFilter(type);

    if (type === "Approved") setSortBy("approved-first");
    if (type === "Pending") setSortBy("pending-first");
    if (type === "Active") setSortBy("active-first");
    if (type === "Inactive") setSortBy("inactive-first");
    if (type === "Admin") setSortBy("admin-first");
    if (type === "Resident") setSortBy("resident-first");
  };

  const resetFilters = () => {
    setSearch("");
    setActiveSummaryFilter("All");
    setSortBy("name-asc");
  };

  const updateUserApproval = async (targetUser, approved) => {
    if (targetUser.email === PRIMARY_OWNER_EMAIL && approved === false) {
      alert("The primary admin account must remain approved.");
      return;
    }

    const action = approved ? "approve" : "move back to pending";
    const name = targetUser.name || targetUser.email || "this user";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${name}?`
    );

    if (!confirmed) return;

    await updateDoc(doc(db, "users", targetUser.id), {
      approved
    });

    if (approved && targetUser.approved === false) {
      await queueApprovalEmail(db, {
        ...targetUser,
        uid: targetUser.uid || targetUser.id
      }).catch((error) => {
        console.error("Approval email queue error:", error);
      });
    }
  };

  const updateUserActiveStatus = async (targetUser, active) => {
    if (targetUser.email === PRIMARY_OWNER_EMAIL && active === false) {
      alert("The primary admin account must remain active.");
      return;
    }

    if (targetUser.id === user.uid && active === false) {
      alert("You cannot deactivate your own admin account.");
      return;
    }

    const action = active ? "activate" : "deactivate";
    const name = targetUser.name || targetUser.email || "this user";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${name}?`
    );

    if (!confirmed) return;

    await updateDoc(doc(db, "users", targetUser.id), {
      active
    });
  };

  const updateUserRole = async (targetUser, role) => {
    if (targetUser.email === PRIMARY_OWNER_EMAIL && role !== "admin") {
      alert("The primary owner account must remain an admin.");
      return;
    }

    if (targetUser.id === user.uid && role !== "admin") {
      alert("You cannot remove your own admin access from inside the app.");
      return;
    }

    const currentRole = getUserRole(targetUser);

    if (currentRole === role) return;

    const name = targetUser.name || targetUser.email || "this user";

    const confirmed = window.confirm(
      `Are you sure you want to change ${name}'s role from ${currentRole} to ${role}?`
    );

    if (!confirmed) return;

    await updateDoc(doc(db, "users", targetUser.id), {
      role
    });
  };

  const saveEditedUser = async (updatedUser) => {
    const name = updatedUser.name || updatedUser.email || "this user";

    const confirmed = window.confirm(
      `Save profile and account changes for ${name}?`
    );

    if (!confirmed) return;

    if (updatedUser.email === PRIMARY_OWNER_EMAIL) {
      updatedUser.role = "admin";
      updatedUser.approved = true;
      updatedUser.active = true;
    }

    if (updatedUser.id === user.uid && updatedUser.role !== "admin") {
      alert("You cannot remove your own admin access from inside the app.");
      return;
    }

    const wasPending = editingUser?.approved === false;
    const isNowApproved = updatedUser.email === PRIMARY_OWNER_EMAIL
      ? true
      : updatedUser.approved ?? true;

    await updateDoc(doc(db, "users", updatedUser.id), {
      name: updatedUser.name,
      email: updatedUser.email,
      address: updatedUser.address,
      phone: normalizePhoneNumber(updatedUser.phone),
      serviceCategories: updatedUser.serviceCategories || [],
      role:
        updatedUser.email === PRIMARY_OWNER_EMAIL
          ? "admin"
          : updatedUser.role || "resident",
      approved:
        updatedUser.email === PRIMARY_OWNER_EMAIL
          ? true
          : updatedUser.approved ?? true,
      active:
        updatedUser.email === PRIMARY_OWNER_EMAIL
          ? true
          : updatedUser.active ?? true,
      profileComplete: Boolean(
        updatedUser.name?.trim() &&
          updatedUser.email?.trim() &&
          updatedUser.address?.trim() &&
          updatedUser.phone?.trim()
      )
    });

    if (wasPending && isNowApproved) {
      await queueApprovalEmail(db, {
        ...updatedUser,
        uid: updatedUser.uid || updatedUser.id
      }).catch((error) => {
        console.error("Approval email queue error:", error);
      });
    }

    setEditingUser(null);
  };

  const addManualUser = async (newUser) => {
    const name = newUser.name || newUser.email || "this user";

    const confirmed = window.confirm(
      `Add ${name} as a new user?`
    );

    if (!confirmed) return;

    await addDoc(collection(db, "users"), {
      name: newUser.name,
      email: newUser.email,
      address: newUser.address,
      phone: normalizePhoneNumber(newUser.phone),
      serviceCategories: newUser.serviceCategories || [],
      role:
        newUser.email === PRIMARY_OWNER_EMAIL
          ? "admin"
          : newUser.role || "resident",
      approved:
        newUser.email === PRIMARY_OWNER_EMAIL
          ? true
          : newUser.approved ?? true,
      active:
        newUser.email === PRIMARY_OWNER_EMAIL
          ? true
          : newUser.active ?? true,
      profileComplete: true,
      manuallyCreated: true
    });

    setShowAddUser(false);
  };

  const deleteUserAccount = async (targetUser) => {
    if (targetUser.email === PRIMARY_OWNER_EMAIL) {
      alert("The primary owner account cannot be deleted.");
      return;
    }

    if (targetUser.id === user.uid) {
      alert("You cannot delete your own account from inside the app.");
      return;
    }

    const name = targetUser.name || targetUser.email || "this user";

    const confirmed = window.confirm(
      `Delete ${name}'s user profile? This removes the Firestore user record but does not remove the Firebase Authentication login account.`
    );

    if (!confirmed) return;

    await deleteDoc(doc(db, "users", targetUser.id));
  };

  const summaryCards = [
    {
      label: "Approved",
      value: summary.approved,
      color: "text-[#067647]",
      activeClass: "bg-[#ecfdf3] border-[#abefc6] ring-2 ring-[#dcfae6]",
      filter: "Approved"
    },
    {
      label: "Pending",
      value: summary.pending,
      color: "text-[#92400e]",
      activeClass: "bg-[#fffbeb] border-[#fde68a] ring-2 ring-[#fef3c7]",
      filter: "Pending"
    },
    {
      label: "Active",
      value: summary.active,
      color: "text-[#1d4ed8]",
      activeClass: "bg-[#eff6ff] border-[#bfdbfe] ring-2 ring-[#dbeafe]",
      filter: "Active"
    },
    {
      label: "Inactive",
      value: summary.inactive,
      color: "text-[#b42318]",
      activeClass: "bg-[#fff1f0] border-[#fecdca] ring-2 ring-[#fee4e2]",
      filter: "Inactive"
    },
    {
      label: "Admins",
      value: summary.admins,
      color: "text-[#1f3a5f]",
      activeClass: "bg-[#eff6ff] border-[#bfdbfe] ring-2 ring-[#dbeafe]",
      filter: "Admin"
    },
    {
      label: "Residents",
      value: summary.residents,
      color: "text-[#475467]",
      activeClass: "bg-[#e2e8f0] border-[#c7d0dc] ring-2 ring-[#d8e0ea]",
      filter: "Resident"
    }
  ];

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-4 mb-6">
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center mb-4">
        <div className="hidden md:block" aria-hidden="true" />

        <div className="text-center">
          <h2 className="text-xl font-bold text-[#172033]">
            Admin User Management
          </h2>

          <p className="text-xs text-[#667085]">
            Add users, edit profiles, approve users, activate/deactivate accounts, and manage admin access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddUser(true)}
          className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-3 py-2 rounded-lg font-semibold text-sm md:justify-self-end"
        >
          Add User
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 mb-4">
        {summaryCards.map((card) => {
          const isSelected = activeSummaryFilter === card.filter;

          return (
            <button
              key={card.label}
              type="button"
              onClick={() => applySummaryFilter(card.filter)}
              className={
                isSelected
                  ? `${card.activeClass} rounded-lg px-2 py-1.5 text-center transition border`
                  : "bg-[#f1f5f9] hover:bg-[#fff1f0] border border-[#c7d0dc] hover:border-[#fecdca] rounded-lg px-2 py-1.5 text-center transition"
              }
            >
              <div className="text-[10px] text-[#667085] leading-tight">
                {card.label}
              </div>

              <div className={`text-base font-bold leading-tight ${card.color}`}>
                {card.value}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-3 mb-4 grid md:grid-cols-[1fr_auto_auto] gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, address"
          className="border border-[#c7d0dc] rounded-lg px-3 py-2 bg-white text-sm w-full"
        />

        <button
          type="button"
          onClick={() => setSearch("")}
          disabled={!search}
          className={
            search
              ? "bg-[#e2e8f0] hover:bg-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg font-semibold text-sm"
              : "bg-[#e2e8f0] text-[#98a2b3] px-3 py-2 rounded-lg font-semibold text-sm cursor-not-allowed"
          }
        >
          Clear Search
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-[#c7d0dc] rounded-lg px-2 py-2 bg-white text-sm"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-between items-center mb-3 text-xs text-[#667085]">
        <div>
          Showing {filteredUsers.length} of {users.length} users
          {activeSummaryFilter !== "All" && (
            <span className="ml-2 font-semibold text-[#b42318]">
              Filter: {activeSummaryFilter}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="underline hover:text-[#172033]"
        >
          Reset filters
        </button>
      </div>

      {showAddUser && (
        <ProfileEditor
          title="Add User"
          user={{
            name: "",
            email: "",
            address: "",
            phone: "",
            serviceCategories: [],
            role: "resident",
            approved: true,
            active: true
          }}
          adminMode
          onCancel={() => setShowAddUser(false)}
          onSave={addManualUser}
        />
      )}

      {editingUser && (
        <ProfileEditor
          title="Edit User"
          user={editingUser}
          adminMode
          onCancel={() => setEditingUser(null)}
          onSave={saveEditedUser}
        />
      )}

      <div className="space-y-4 md:hidden">
        {filteredUsers.map((u) => {
          const approved = u.approved !== false;
          const active = u.active !== false;
          const role = getUserRole(u);
          const isPrimaryOwner = u.email === PRIMARY_OWNER_EMAIL;

          return (
            <div key={u.id} className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[#172033] truncate">
                    {u.name || "Unnamed User"}
                  </div>
                  <div className="text-[11px] text-[#667085] truncate">
                    {u.email || "No email"}
                  </div>
                  <div className="text-[11px] text-[#667085] mt-1 truncate">
                    {formatPhoneNumber(u.phone) || "No phone"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(u)}
                  className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap"
                >
                  Edit
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#475467]">
                <div>
                  Role: <span className="font-semibold capitalize">{role}</span>
                </div>
                <div className="break-words">
                  Address: {u.address || "No address"}
                </div>
                <div>
                  Approved: <span className={approved ? "font-semibold text-[#067647]" : "font-semibold text-[#92400e]"}>
                    {approved ? "Yes" : "No"}
                  </span>
                </div>
                <div>
                  Active: <span className={active ? "font-semibold text-[#1d4ed8]" : "font-semibold text-[#b42318]"}>
                    {active ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateUserRole(u, role === "admin" ? "resident" : "admin")}
                  disabled={isPrimaryOwner || u.id === user.uid}
                  className={
                    isPrimaryOwner || u.id === user.uid
                      ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg text-[10px] font-semibold cursor-not-allowed"
                      : role === "admin"
                        ? "bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1f3a5f] border border-[#bfdbfe] px-2 py-1 rounded-lg text-[10px] font-semibold"
                        : "bg-white hover:bg-[#e2e8f0] text-[#475467] border border-[#c7d0dc] px-2 py-1 rounded-lg text-[10px] font-semibold"
                  }
                >
                  {role === "admin" ? "Make Resident" : "Make Admin"}
                </button>

                <button
                  type="button"
                  onClick={() => updateUserApproval(u, !approved)}
                  disabled={isPrimaryOwner}
                  className={
                    isPrimaryOwner
                      ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg text-[10px] font-semibold cursor-not-allowed"
                      : approved
                        ? "bg-[#ecfdf3] hover:bg-[#dcfae6] text-[#067647] border border-[#abefc6] px-2 py-1 rounded-lg text-[10px] font-semibold"
                        : "bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-2 py-1 rounded-lg text-[10px] font-semibold"
                  }
                >
                  {approved ? "Approved" : "Pending"}
                </button>

                <button
                  type="button"
                  onClick={() => updateUserActiveStatus(u, !active)}
                  disabled={isPrimaryOwner}
                  className={
                    isPrimaryOwner
                      ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg text-[10px] font-semibold cursor-not-allowed"
                      : active
                        ? "bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] px-2 py-1 rounded-lg text-[10px] font-semibold"
                        : "bg-[#fff1f0] hover:bg-[#fee4e2] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-lg text-[10px] font-semibold"
                  }
                >
                  {active ? "Deactivate" : "Activate"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteUserAccount(u)}
                  disabled={isPrimaryOwner || u.id === user.uid}
                  className={
                    isPrimaryOwner || u.id === user.uid
                      ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg text-[10px] font-semibold cursor-not-allowed"
                      : "bg-[#fff1f0] hover:bg-[#fee4e2] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-lg text-[10px] font-semibold"
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-[11px] text-[#667085]">
              <th className="px-2 py-1 min-w-[130px]">User</th>
              <th className="px-2 py-1 min-w-[150px]">Email</th>
              <th className="px-1 py-1 min-w-[90px]">Phone</th>
              <th className="px-1 py-1 min-w-[80px]">Role</th>
              <th className="px-1 py-1 min-w-[80px]">Approved</th>
              <th className="px-1 py-1 min-w-[80px]">Status</th>
              <th className="px-1 py-1 min-w-[110px]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => {
              const approved = u.approved !== false;
              const active = u.active !== false;
              const role = getUserRole(u);
              const isPrimaryOwner = u.email === PRIMARY_OWNER_EMAIL;

              return (
                <tr key={u.id} className="bg-[#f1f5f9] align-top">
                  <td className="px-2 py-2 rounded-l-lg">
                    <div className="font-semibold text-[#172033] text-xs leading-tight truncate max-w-[140px]">
                      {u.name || "Unnamed User"}

                      {u.id === user.uid && (
                        <span className="ml-1 text-[10px] text-[#1d4ed8]">
                          You
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-[#667085] leading-tight truncate max-w-[140px]">
                      {u.address || "No address"}
                    </div>
                  </td>

                  <td className="px-2 py-2 text-[11px] text-[#475467]">
                    <div className="truncate max-w-[160px]">
                      {u.email || "No email"}
                    </div>
                  </td>

                  <td className="px-1 py-2 text-[11px] text-[#475467] whitespace-nowrap">
                    {formatPhoneNumber(u.phone) || "No phone"}
                  </td>

                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateUserRole(
                          u,
                          role === "admin" ? "resident" : "admin"
                        )
                      }
                      disabled={isPrimaryOwner || u.id === user.uid}
                      className={
                        isPrimaryOwner || u.id === user.uid
                          ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                          : role === "admin"
                            ? "bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1f3a5f] border border-[#bfdbfe] px-2 py-1 rounded-lg font-semibold text-[10px]"
                            : "bg-white hover:bg-[#e2e8f0] text-[#475467] border border-[#c7d0dc] px-2 py-1 rounded-lg font-semibold text-[10px]"
                      }
                    >
                      {role}
                    </button>
                  </td>

                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() => updateUserApproval(u, !approved)}
                      disabled={isPrimaryOwner}
                      className={
                        isPrimaryOwner
                          ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                          : approved
                            ? "bg-[#ecfdf3] hover:bg-[#dcfae6] text-[#067647] border border-[#abefc6] px-2 py-1 rounded-lg font-semibold text-[10px]"
                            : "bg-[#fffbeb] hover:bg-[#fef3c7] text-[#92400e] border border-[#fde68a] px-2 py-1 rounded-lg font-semibold text-[10px]"
                      }
                    >
                      {approved ? "Approved" : "Pending"}
                    </button>
                  </td>

                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() => updateUserActiveStatus(u, !active)}
                      disabled={isPrimaryOwner}
                      className={
                        isPrimaryOwner
                          ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                          : active
                            ? "bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe] px-2 py-1 rounded-lg font-semibold text-[10px]"
                            : "bg-[#fff1f0] hover:bg-[#fee4e2] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-lg font-semibold text-[10px]"
                      }
                    >
                      {active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td className="px-1 py-2 rounded-r-lg">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-2 py-1 rounded-lg font-semibold text-[10px]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUserAccount(u)}
                        disabled={isPrimaryOwner || u.id === user.uid}
                        className={
                          isPrimaryOwner || u.id === user.uid
                            ? "bg-[#e2e8f0] text-[#98a2b3] px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                            : "bg-[#fff1f0] hover:bg-[#fee4e2] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-lg font-semibold text-[10px]"
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center text-[#667085] py-8 text-sm">
          No users match the selected filters.
        </div>
      )}
    </div>
  );
}
