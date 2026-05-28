import { useMemo, useState } from "react";
import { formatPhoneNumber } from "../utils/formatPhoneNumber";

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

function PrintableUserDetails({ user, onClose }) {
  const printProfile = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between print:hidden">
          <h2 className="text-2xl font-bold">Resident Details</h2>

          <div className="flex gap-2">
            <button
              onClick={printProfile}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold"
            >
              Print
            </button>

            <button
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-semibold"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6" id="printable-resident-profile">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{user.name || "Unnamed User"}</h1>
            <p className="text-gray-500">Hurricane Hearts Resident Profile</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="border rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Name</div>
              <div>{user.name || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Phone</div>
              <div>{formatPhoneNumber(user.phone) || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Email</div>
              <div className="break-all">{user.email || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Address</div>
              <div>{user.address || "Not provided"}</div>
            </div>

            <div className="border rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Role</div>
              <div className="capitalize">{user.role || "resident"}</div>
            </div>

            <div className="border rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Status</div>
              <div>{user.active !== false ? "Active" : "Inactive"}</div>
            </div>
          </div>

          <div className="border rounded-2xl p-4">
            <div className="text-xl font-bold mb-3">Willing to Help With</div>

            <div className="grid md:grid-cols-2 gap-3">
              {requestCategories.map((category) => {
                const selected = (user.serviceCategories || []).includes(category);

                return (
                  <div
                    key={category}
                    className={
                      selected
                        ? "border border-green-300 bg-green-50 rounded-xl p-3 font-semibold"
                        : "border rounded-xl p-3 text-gray-400"
                    }
                  >
                    <span className="mr-2">{selected ? "✓" : "—"}</span>
                    {category}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDirectory({ users = [] }) {
  const categoryAbbreviations = {
    "Wellness Check": "Well",
    Transportation: "Trans",
    "Food-Water": "Food",
    "Adopt A Buddy": "Buddy",
    "Storm Prep": "Prep",
    "Storm Cleanup": "Clean",
    "Power-Generator Help": "Power",
    "Pet Assistance": "Pets",
    "Borrow Supplies": "Borrow",
    Other: "Other"
  };
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

  const changeSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc"
        };
      }

      return { key, direction: "asc" };
    });
  };

  const sortLabel = (key) => {
    if (sortConfig.key !== key) return "";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users
      .filter((u) => u.active !== false && u.approved !== false)
      .filter((u) => {
        if (!term) return true;
        return (
          (u.name || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term) ||
          (u.phone || "").toLowerCase().includes(term) ||
          formatPhoneNumber(u.phone || "").toLowerCase().includes(term) ||
          (u.address || "").toLowerCase().includes(term) ||
          (u.serviceCategories || []).some((category) =>
            category.toLowerCase().includes(term)
          )
        );
      })
      .sort((a, b) => {
        const sortValue = (user) => {
          if (sortConfig.key === "name") {
            return user.name || "";
          }

          if (sortConfig.key === "phone") {
            return user.phone || "";
          }

          return (user.serviceCategories || []).includes(sortConfig.key)
            ? "1"
            : "0";
        }

        const comparison = sortValue(a).localeCompare(sortValue(b));
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
  }, [users, search, sortConfig]);

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-6 mb-8">
      <div className="grid gap-4 mb-5 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="hidden md:block" aria-hidden="true" />

        <div className="text-center">
          <h2 className="text-xl font-bold text-[#172033]">Resident Directory</h2>
          <p className="text-xs text-[#667085]">
            Search residents and view helper categories.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto md:justify-self-end">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, address, phone, email, or category"
            className="border border-[#c7d0dc] rounded-lg px-3 py-2 text-sm w-full md:w-80"
          />

          <button
            type="button"
            onClick={() => setSearch("")}
            disabled={!search}
            className={
              search
                ? "bg-[#e2e8f0] hover:bg-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg text-sm font-semibold"
                : "bg-[#e2e8f0] text-[#98a2b3] px-3 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"
            }
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {filteredUsers.map((u) => {
          const selectedCategories = (u.serviceCategories || []).filter(Boolean);

          return (
            <div key={u.id} className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-[#172033] truncate">
                    {u.name || "Unnamed User"}
                  </div>
                  <div className="text-xs text-[#667085] truncate">
                    {u.email || "No email"}
                  </div>
                  <div className="text-xs text-[#667085] mt-1 truncate">
                    {formatPhoneNumber(u.phone) || "No phone"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(u)}
                  className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
                >
                  Details
                </button>
              </div>

              <div className="text-xs text-[#475467] mt-3 break-words">
                {u.address || "No address"}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCategories.slice(0, 6).map((category) => (
                  <span
                    key={category}
                    className="bg-[#fff1f0] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-full text-[11px]"
                  >
                    {category}
                  </span>
                ))}
                {selectedCategories.length > 6 && (
                  <span className="bg-[#f2f4f7] text-[#475467] px-2 py-1 rounded-full text-[11px]">
                    +{selectedCategories.length - 6} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-left border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-xs text-[#667085] uppercase">
              <th className="px-2 py-2 sticky left-0 bg-white z-10 min-w-[130px]">
                <button
                  type="button"
                  onClick={() => changeSort("name")}
                  className="font-bold hover:text-[#b42318]"
                >
                  Name{sortLabel("name")}
                </button>
              </th>
              <th className="px-2 py-2 min-w-[105px]">
                <button
                  type="button"
                  onClick={() => changeSort("phone")}
                  className="font-bold hover:text-[#b42318]"
                >
                  Phone{sortLabel("phone")}
                </button>
              </th>
              {requestCategories.map((category) => (
                <th key={category} className="px-1 py-2 text-center min-w-[54px]">
                  <button
                    type="button"
                    onClick={() => changeSort(category)}
                    title={category}
                    className="font-bold hover:text-[#b42318] leading-tight"
                  >
                    {categoryAbbreviations[category] || category}{sortLabel(category)}
                  </button>
                </th>
              ))}
              <th className="px-2 py-2 min-w-[70px]">Details</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="bg-[#f1f5f9]">
                <td className="px-2 py-2 font-semibold rounded-l-lg sticky left-0 bg-[#f1f5f9] z-10 min-w-[130px]">
                  {u.name || "Unnamed User"}
                </td>

                <td className="px-2 py-2 min-w-[105px] whitespace-nowrap">{formatPhoneNumber(u.phone) || "Not provided"}</td>

                {requestCategories.map((category) => {
                  const selected = (u.serviceCategories || []).includes(category);

                  return (
                    <td key={category} className="px-1 py-2 text-center">
                      <span
                        className={
                          selected
                            ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#ecfdf3] text-[#067647] font-bold text-xs"
                            : "inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e2e8f0] text-[#98a2b3] text-xs"
                        }
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </td>
                  );
                })}

                <td className="px-2 py-2 rounded-r-xl min-w-[70px]">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-2 py-1 rounded-md text-xs font-semibold"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center text-[#667085] py-8">
          No residents match your search.
        </div>
      )}

      {selectedUser && (
        <PrintableUserDetails
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
