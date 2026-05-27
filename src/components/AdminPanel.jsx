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

const approvalFilters = ["All", "Approved", "Pending"];
const statusFilters = ["All", "Active", "Inactive"];
const roleFilters = ["All", "Admin", "Resident"];

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
  const [approvalFilter, setApprovalFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name-asc");

  if (user.role !== "admin") return null;

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

        if (approvalFilter === "Approved") return approved;
        if (approvalFilter === "Pending") return !approved;

        return true;
      })
      .filter((u) => {
        const active = u.active !== false;

        if (statusFilter === "Active") return active;
        if (statusFilter === "Inactive") return !active;

        return true;
      })
      .filter((u) => {
        const role = getUserRole(u);

        if (roleFilter === "Admin") return role === "admin";
        if (roleFilter === "Resident") return role !== "admin";

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
  }, [
    users,
    search,
    approvalFilter,
    statusFilter,
    roleFilter,
    sortBy
  ]);

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

  const applySummaryFilter = (type) => {
    setSearch("");

    if (type === "Approved") {
      setApprovalFilter("Approved");
      setStatusFilter("All");
      setRoleFilter("All");
      setSortBy("approved-first");
      return;
    }

    if (type === "Pending") {
      setApprovalFilter("Pending");
      setStatusFilter("All");
      setRoleFilter("All");
      setSortBy("pending-first");
      return;
    }

    if (type === "Active") {
      setApprovalFilter("All");
      setStatusFilter("Active");
      setRoleFilter("All");
      setSortBy("active-first");
      return;
    }

    if (type === "Inactive") {
      setApprovalFilter("All");
      setStatusFilter("Inactive");
      setRoleFilter("All");
      setSortBy("inactive-first");
      return;
    }

    if (type === "Admin") {
      setApprovalFilter("All");
      setStatusFilter("All");
      setRoleFilter("Admin");
      setSortBy("admin-first");
      return;
    }

    if (type === "Resident") {
      setApprovalFilter("All");
      setStatusFilter("All");
      setRoleFilter("Resident");
      setSortBy("resident-first");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setApprovalFilter("All");
    setStatusFilter("All");
    setRoleFilter("All");
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
      color: "text-green-700",
      filter: "Approved"
    },
    {
      label: "Pending",
      value: summary.pending,
      color: "text-yellow-700",
      filter: "Pending"
    },
    {
      label: "Active",
      value: summary.active,
      color: "text-blue-700",
      filter: "Active"
    },
    {
      label: "Inactive",
      value: summary.inactive,
      color: "text-red-700",
      filter: "Inactive"
    },
    {
      label: "Admins",
      value: summary.admins,
      color: "text-purple-700",
      filter: "Admin"
    },
    {
      label: "Residents",
      value: summary.residents,
      color: "text-gray-700",
      filter: "Resident"
    }
  ];

  return (
    <div className="bg-white rounded-3xl shadow-md p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">
            Admin User Management
          </h2>

          <p className="text-xs text-gray-500">
            Add users, edit profiles, approve users, activate/deactivate accounts, and manage admin access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddUser(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-semibold text-sm"
        >
          Add User
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-4">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => applySummaryFilter(card.filter)}
            className="bg-gray-50 hover:bg-red-50 border border-gray-100 hover:border-red-200 rounded-2xl p-3 text-left transition"
          >
            <div className="text-xs text-gray-500">
              {card.label}
            </div>

            <div className={`text-xl font-bold ${card.color}`}>
              {card.value}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-gray-50 rounded-2xl p-3 mb-4 grid lg:grid-cols-6 gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, address"
          className="border rounded-xl px-3 py-2 bg-white text-sm lg:col-span-2"
        />

        <select
          value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}
          className="border rounded-xl px-2 py-2 bg-white text-sm"
        >
          {approvalFilters.map((filter) => (
            <option key={filter} value={filter}>
              {filter} Approval
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-xl px-2 py-2 bg-white text-sm"
        >
          {statusFilters.map((filter) => (
            <option key={filter} value={filter}>
              {filter} Status
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-xl px-2 py-2 bg-white text-sm"
        >
          {roleFilters.map((filter) => (
            <option key={filter} value={filter}>
              {filter} Role
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded-xl px-2 py-2 bg-white text-sm"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-between items-center mb-3 text-xs text-gray-500">
        <div>
          Showing {filteredUsers.length} of {users.length} users
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="underline hover:text-gray-700"
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

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-[11px] text-gray-500">
              <th className="px-2 py-1 w-[150px]">User</th>
              <th className="px-2 py-1 w-[170px]">Email</th>
              <th className="px-1 py-1 w-[110px]">Phone</th>
              <th className="px-1 py-1 w-[90px]">Role</th>
              <th className="px-1 py-1 w-[95px]">Approved</th>
              <th className="px-1 py-1 w-[85px]">Status</th>
              <th className="px-1 py-1 w-[120px]">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => {
              const approved = u.approved !== false;
              const active = u.active !== false;
              const role = getUserRole(u);
              const isPrimaryOwner = u.email === PRIMARY_OWNER_EMAIL;

              return (
                <tr key={u.id} className="bg-gray-50 align-top">
                  <td className="px-2 py-2 rounded-l-2xl">
                    <div className="font-semibold text-gray-900 text-xs leading-tight truncate max-w-[140px]">
                      {u.name || "Unnamed User"}

                      {u.id === user.uid && (
                        <span className="ml-1 text-[10px] text-blue-600">
                          You
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-500 leading-tight truncate max-w-[140px]">
                      {u.address || "No address"}
                    </div>
                  </td>

                  <td className="px-2 py-2 text-[11px] text-gray-600">
                    <div className="truncate max-w-[160px]">
                      {u.email || "No email"}
                    </div>
                  </td>

                  <td className="px-1 py-2 text-[11px] text-gray-600 whitespace-nowrap">
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
                          ? "bg-gray-100 text-gray-400 px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                          : role === "admin"
                            ? "bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
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
                          ? "bg-gray-100 text-gray-400 px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                          : approved
                            ? "bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
                            : "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
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
                          ? "bg-gray-100 text-gray-400 px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                          : active
                            ? "bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
                            : "bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
                      }
                    >
                      {active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td className="px-1 py-2 rounded-r-2xl">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-lg font-semibold text-[10px]"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteUserAccount(u)}
                        disabled={isPrimaryOwner || u.id === user.uid}
                        className={
                          isPrimaryOwner || u.id === user.uid
                            ? "bg-gray-100 text-gray-400 px-2 py-1 rounded-lg font-semibold cursor-not-allowed text-[10px]"
                            : "bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-lg font-semibold text-[10px]"
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
        <div className="text-center text-gray-500 py-8 text-sm">
          No users match the selected filters.
        </div>
      )}
    </div>
  );
}