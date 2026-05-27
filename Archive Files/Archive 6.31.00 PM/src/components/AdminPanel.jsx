import { useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import ProfileEditor from "./ProfileEditor";
import { formatPhoneNumber, normalizePhoneNumber } from "../utils/formatPhoneNumber";

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
  return u.email === PRIMARY_OWNER_EMAIL ? "admin" : (u.role || "resident");
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

    const sorted = [...users]
      .filter((u) => {
        if (!term) return true;

        return (
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term) ||
          (u.phone || "").toLowerCase().includes(term) ||
          formatPhoneNumber(u.phone || "").toLowerCase().includes(term) ||
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

    sorted.sort((a, b) => {
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

    return sorted;
  }, [users, search, approvalFilter, statusFilter, roleFilter, sortBy]);

  const summary = useMemo(() => {
    const approved = users.filter((u) => u.approved !== false).length;
    const pending = users.filter((u) => u.approved === false).length;
    const active = users.filter((u) => u.active !== false).length;
    const inactive = users.filter((u) => u.active === false).length;
    const admins = users.filter((u) => getUserRole(u) === "admin").length;
    const residents = users.filter((u) => getUserRole(u) !== "admin").length;

    return { approved, pending, active, inactive, admins, residents };
  }, [users]);

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

    await updateDoc(doc(db, "users", targetUser.id), { approved });
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

    await updateDoc(doc(db, "users", targetUser.id), { active });
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

    await updateDoc(doc(db, "users", targetUser.id), { role });
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
      role: updatedUser.email === PRIMARY_OWNER_EMAIL ? "admin" : (updatedUser.role || "resident"),
      approved: updatedUser.email === PRIMARY_OWNER_EMAIL ? true : (updatedUser.approved ?? true),
      active: updatedUser.email === PRIMARY_OWNER_EMAIL ? true : (updatedUser.active ?? true),
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
      role: newUser.email === PRIMARY_OWNER_EMAIL ? "admin" : (newUser.role || "resident"),
      approved: newUser.email === PRIMARY_OWNER_EMAIL ? true : (newUser.approved ?? true),
      active: newUser.email === PRIMARY_OWNER_EMAIL ? true : (newUser.active ?? true),
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

  const resetFilters = () => {
    setSearch("");
    setApprovalFilter("All");
    setStatusFilter("All");
    setRoleFilter("All");
    setSortBy("name-asc");
  };

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-2xl font-bold">Admin User Management</h2>
          <p className="text-sm text-gray-500">
            Add users, edit profiles, approve users, activate/deactivate accounts, and manage admin access.
          </p>
        </div>

        <button
          onClick={() => setShowAddUser(true)}
          className="bg-red-600 text-white px-4 py-3 rounded-2xl font-semibold"
        >
          Add User
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(140px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
          width: "100%",
          alignItems: "stretch"
        }}
      >
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-700">{summary.approved}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">{summary.pending}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-blue-700">{summary.active}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Inactive</div>
          <div className="text-2xl font-bold text-red-700">{summary.inactive}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Admins</div>
          <div className="text-2xl font-bold text-purple-700">{summary.admins}</div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="text-sm text-gray-500">Residents</div>
          <div className="text-2xl font-bold text-gray-700">{summary.residents}</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-3xl p-4 mb-5 grid lg:grid-cols-6 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone, address"
          className="border rounded-2xl px-4 py-3 bg-white lg:col-span-2"
        />

        <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className="border rounded-2xl px-4 py-3 bg-white">
          {approvalFilters.map((filter) => <option key={filter} value={filter}>{filter} Approval</option>)}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-2xl px-4 py-3 bg-white">
          {statusFilters.map((filter) => <option key={filter} value={filter}>{filter} Status</option>)}
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border rounded-2xl px-4 py-3 bg-white">
          {roleFilters.map((filter) => <option key={filter} value={filter}>{filter} Role</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded-2xl px-4 py-3 bg-white">
          {sortOptions.map((option) => <option key={option.value} value={option.value}>Sort: {option.label}</option>)}
        </select>
      </div>

      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <div>Showing {filteredUsers.length} of {users.length} users</div>
        <button onClick={resetFilters} className="underline hover:text-gray-700">Reset filters</button>
      </div>

      {showAddUser && (
        <ProfileEditor
          title="Add User"
          user={{ name: "", email: "", address: "", phone: "", serviceCategories: [], role: "resident", approved: true, active: true }}
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
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-sm text-gray-500">
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Role</th>
              <th className="p-3">Approved</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => {
              const approved = u.approved !== false;
              const active = u.active !== false;
              const role = getUserRole(u);
              const isPrimaryOwner = u.email === PRIMARY_OWNER_EMAIL;

              return (
                <tr key={u.id} className="bg-gray-50 border rounded-2xl">
                  <td className="p-3 rounded-l-2xl font-semibold">
                    {u.name || "Unnamed User"}
                    {u.id === user.uid && <span className="ml-2 text-xs text-blue-600">You</span>}
                  </td>

                  <td className="p-3 text-sm text-gray-600">{u.email || "No email"}</td>
                  <td className="p-3 text-sm text-gray-600">{formatPhoneNumber(u.phone) || "No phone"}</td>
                  <td className="p-3 text-sm text-gray-600">{u.address || "No address"}</td>

                  <td className="p-3 text-sm text-gray-700 capitalize">
                    <span className="bg-gray-100 px-3 py-2 rounded-xl font-semibold inline-block">
                      {role}
                    </span>
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() => updateUserApproval(u, !approved)}
                      disabled={isPrimaryOwner}
                      className={
                        isPrimaryOwner
                          ? "bg-gray-100 text-gray-400 px-3 py-2 rounded-xl font-semibold cursor-not-allowed"
                          : approved
                            ? "bg-green-100 text-green-700 px-3 py-2 rounded-xl font-semibold"
                            : "bg-yellow-100 text-yellow-700 px-3 py-2 rounded-xl font-semibold"
                      }
                    >
                      {approved ? "Approved" : "Pending"}
                    </button>
                  </td>

                  <td className="p-3">
                    <button
                      onClick={() => updateUserActiveStatus(u, !active)}
                      disabled={isPrimaryOwner}
                      className={
                        isPrimaryOwner
                          ? "bg-gray-100 text-gray-400 px-3 py-2 rounded-xl font-semibold cursor-not-allowed"
                          : active
                            ? "bg-blue-100 text-blue-700 px-3 py-2 rounded-xl font-semibold"
                            : "bg-red-100 text-red-700 px-3 py-2 rounded-xl font-semibold"
                      }
                    >
                      {active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td className="p-3 rounded-r-2xl">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-xl font-semibold"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteUserAccount(u)}
                        disabled={isPrimaryOwner || u.id === user.uid}
                        className={
                          isPrimaryOwner || u.id === user.uid
                            ? "bg-gray-100 text-gray-400 px-3 py-2 rounded-xl font-semibold cursor-not-allowed"
                            : "bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-xl font-semibold"
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

      {filteredUsers.length === 0 && <div className="text-center text-gray-500 py-8">No users match the selected filters.</div>}
    </div>
  );
}