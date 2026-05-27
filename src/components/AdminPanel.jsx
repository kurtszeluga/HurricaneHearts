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

const PRIMARY_OWNER_EMAIL =
  "hurricanehearts.admin@gmail.com";

function getUserRole(u) {
  return u.email === PRIMARY_OWNER_EMAIL
    ? "admin"
    : u.role || "resident";
}

export default function AdminPanel({
  user,
  users
}) {

  const [editingUser, setEditingUser] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [approvalFilter, setApprovalFilter] =
    useState("All");

  if (user.role !== "admin") return null;

  const filteredUsers = useMemo(() => {

    return users.filter((u) => {

      const term =
        search.trim().toLowerCase();

      const matchesSearch =
        !term ||
        (u.name || "")
          .toLowerCase()
          .includes(term) ||
        (u.email || "")
          .toLowerCase()
          .includes(term) ||
        (u.phone || "")
          .toLowerCase()
          .includes(term) ||
        (u.address || "")
          .toLowerCase()
          .includes(term);

      const approved =
        u.approved !== false;

      const matchesApproval =
        approvalFilter === "All"
          ? true
          : approvalFilter === "Approved"
            ? approved
            : !approved;

      return (
        matchesSearch &&
        matchesApproval
      );
    });

  }, [users, search, approvalFilter]);

  const approvedCount =
    users.filter(
      (u) => u.approved !== false
    ).length;

  const pendingCount =
    users.filter(
      (u) => u.approved === false
    ).length;

  const activeCount =
    users.filter(
      (u) => u.active !== false
    ).length;

  const inactiveCount =
    users.filter(
      (u) => u.active === false
    ).length;

  const applySummaryFilter = (filter) => {

    if (filter === "Approved") {
      setApprovalFilter("Approved");
      return;
    }

    if (filter === "Pending") {
      setApprovalFilter("Pending");
      return;
    }

    setApprovalFilter("All");
  };

  const updateUserApproval = async (
    targetUser,
    approved
  ) => {

    await updateDoc(
      doc(db, "users", targetUser.id),
      {
        approved
      }
    );
  };

  const updateUserActiveStatus = async (
    targetUser,
    active
  ) => {

    await updateDoc(
      doc(db, "users", targetUser.id),
      {
        active
      }
    );
  };

  const saveEditedUser = async (
    updatedUser
  ) => {

    await updateDoc(
      doc(db, "users", updatedUser.id),
      {
        name: updatedUser.name,
        email: updatedUser.email,
        address: updatedUser.address,
        phone: normalizePhoneNumber(
          updatedUser.phone
        ),
        role: updatedUser.role,
        approved:
          updatedUser.approved,
        active:
          updatedUser.active
      }
    );

    setEditingUser(null);
  };

  return (

    <div className="bg-white rounded-3xl shadow-md p-4 mb-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">

        <div>

          <h2 className="text-xl font-bold">
            User Management
          </h2>

          <p className="text-xs text-gray-500">
            Manage residents and admins
          </p>

        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">

        <button
          onClick={() =>
            applySummaryFilter(
              "Approved"
            )
          }
          className="bg-green-50 hover:bg-green-100 rounded-2xl p-3 text-left transition"
        >

          <div className="text-xs text-gray-500">
            Approved
          </div>

          <div className="text-xl font-bold text-green-700">
            {approvedCount}
          </div>

        </button>

        <button
          onClick={() =>
            applySummaryFilter(
              "Pending"
            )
          }
          className="bg-yellow-50 hover:bg-yellow-100 rounded-2xl p-3 text-left transition"
        >

          <div className="text-xs text-gray-500">
            Pending
          </div>

          <div className="text-xl font-bold text-yellow-700">
            {pendingCount}
          </div>

        </button>

        <div className="bg-blue-50 rounded-2xl p-3">

          <div className="text-xs text-gray-500">
            Active
          </div>

          <div className="text-xl font-bold text-blue-700">
            {activeCount}
          </div>

        </div>

        <div className="bg-red-50 rounded-2xl p-3">

          <div className="text-xs text-gray-500">
            Inactive
          </div>

          <div className="text-xl font-bold text-red-700">
            {inactiveCount}
          </div>

        </div>

      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-4">

        <input
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search users..."
          className="border rounded-2xl px-3 py-2 text-sm flex-1"
        />

        <select
          value={approvalFilter}
          onChange={(e) =>
            setApprovalFilter(
              e.target.value
            )
          }
          className="border rounded-2xl px-3 py-2 text-sm"
        >

          <option value="All">
            All Users
          </option>

          <option value="Approved">
            Approved
          </option>

          <option value="Pending">
            Pending
          </option>

        </select>

      </div>

      {editingUser && (

        <ProfileEditor
          title="Edit User"
          user={editingUser}
          adminMode
          onCancel={() =>
            setEditingUser(null)
          }
          onSave={saveEditedUser}
        />

      )}

      <div className="overflow-x-auto">

        <table className="w-full text-left border-separate border-spacing-y-1">

          <thead>

            <tr className="text-xs text-gray-500">

              <th className="px-2 py-1">
                User
              </th>

              <th className="px-2 py-1">
                Email
              </th>

              <th className="px-2 py-1">
                Phone
              </th>

              <th className="px-2 py-1">
                Role
              </th>

              <th className="px-2 py-1">
                Approved
              </th>

              <th className="px-2 py-1">
                Status
              </th>

              <th className="px-2 py-1">
                Actions
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredUsers.map((u) => {

              const approved =
                u.approved !== false;

              const active =
                u.active !== false;

              const role =
                getUserRole(u);

              return (

                <tr
                  key={u.id}
                  className="bg-gray-50"
                >

                  <td className="px-2 py-2 rounded-l-2xl">

                    <div className="text-sm font-semibold leading-tight">
                      {u.name || "Unnamed"}
                    </div>

                    <div className="text-[11px] text-gray-500 truncate max-w-[120px]">
                      {u.address}
                    </div>

                  </td>

                  <td className="px-2 py-2 text-[12px] text-gray-700 max-w-[140px] truncate">
                    {u.email}
                  </td>

                  <td className="px-2 py-2 text-[12px] text-gray-700 whitespace-nowrap">
                    {formatPhoneNumber(
                      u.phone
                    )}
                  </td>

                  <td className="px-2 py-2">

                    <span className={
                      role === "admin"
                        ? "bg-purple-100 text-purple-700 px-2 py-1 rounded-xl text-[11px] font-semibold"
                        : "bg-gray-200 text-gray-700 px-2 py-1 rounded-xl text-[11px] font-semibold"
                    }>
                      {role}
                    </span>

                  </td>

                  <td className="px-2 py-2">

                    <button
                      onClick={() =>
                        updateUserApproval(
                          u,
                          !approved
                        )
                      }
                      className={
                        approved
                          ? "bg-green-100 text-green-700 px-2 py-1 rounded-xl text-[11px] font-semibold"
                          : "bg-yellow-100 text-yellow-700 px-2 py-1 rounded-xl text-[11px] font-semibold"
                      }
                    >
                      {approved
                        ? "Approved"
                        : "Pending"}
                    </button>

                  </td>

                  <td className="px-2 py-2">

                    <button
                      onClick={() =>
                        updateUserActiveStatus(
                          u,
                          !active
                        )
                      }
                      className={
                        active
                          ? "bg-blue-100 text-blue-700 px-2 py-1 rounded-xl text-[11px] font-semibold"
                          : "bg-red-100 text-red-700 px-2 py-1 rounded-xl text-[11px] font-semibold"
                      }
                    >
                      {active
                        ? "Active"
                        : "Inactive"}
                    </button>

                  </td>

                  <td className="px-2 py-2 rounded-r-2xl">

                    <button
                      onClick={() =>
                        setEditingUser(u)
                      }
                      className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded-xl text-[11px] font-semibold"
                    >
                      Edit
                    </button>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

    </div>
  );
}