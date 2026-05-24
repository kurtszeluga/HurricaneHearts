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
        let valueA = "";
        let valueB = "";

        if (sortConfig.key === "name") {
          valueA = a.name || "";
          valueB = b.name || "";
        } else if (sortConfig.key === "phone") {
          valueA = a.phone || "";
          valueB = b.phone || "";
        } else {
          const aSelected = (a.serviceCategories || []).includes(sortConfig.key);
          const bSelected = (b.serviceCategories || []).includes(sortConfig.key);
          valueA = aSelected ? "1" : "0";
          valueB = bSelected ? "1" : "0";
        }

        const comparison = valueA.localeCompare(valueB);
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
  }, [users, search, sortConfig]);

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">Resident Directory</h2>
          <p className="text-xs text-gray-500">
            Search residents and view helper categories.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, address, phone, email, or category"
            className="border rounded-xl px-3 py-2 text-sm w-full md:w-80"
          />

          <button
            type="button"
            onClick={() => setSearch("")}
            disabled={!search}
            className={
              search
                ? "bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold"
                : "bg-gray-100 text-gray-400 px-3 py-2 rounded-xl text-sm font-semibold cursor-not-allowed"
            }
          >
            Clear
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="px-2 py-2 sticky left-0 bg-white z-10 min-w-[130px]">
                <button
                  type="button"
                  onClick={() => changeSort("name")}
                  className="font-bold hover:text-red-600"
                >
                  Name{sortLabel("name")}
                </button>
              </th>
              <th className="px-2 py-2 min-w-[105px]">
                <button
                  type="button"
                  onClick={() => changeSort("phone")}
                  className="font-bold hover:text-red-600"
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
                    className="font-bold hover:text-red-600 leading-tight"
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
              <tr key={u.id} className="bg-gray-50">
                <td className="px-2 py-2 font-semibold rounded-l-xl sticky left-0 bg-gray-50 z-10 min-w-[130px]">
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
                            ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 font-bold text-xs"
                            : "inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-300 text-xs"
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-xs font-semibold"
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
        <div className="text-center text-gray-500 py-8">
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