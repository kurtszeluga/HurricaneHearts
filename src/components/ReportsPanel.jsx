import { formatPhoneNumber } from "../utils/formatPhoneNumber";
import { formatDateOnly, formatDateTime } from "../utils/formatDate";

function convertToCsv(rows) {
  if (!rows.length) return "";

  const headers = Object.keys(rows[0]);

  const escapeValue = (value) => {
    if (value === null || value === undefined) return "";

    const stringValue = Array.isArray(value)
      ? value.join(" | ")
      : String(value);

    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","))
  ];

  return csv.join("\n");
}

function downloadCsv(filename, rows) {
  const csv = convertToCsv(rows);

  if (!csv) {
    alert("No records available to export.");
    return;
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "all-events")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function ReportsPanel({ user, users = [], requests = [], requestHistory = [] }) {
  if (user.role !== "admin") return null;

  const confirmExport = (label, count) => {
    return window.confirm(`Export ${count} ${label} record${count === 1 ? "" : "s"} to CSV?`);
  };

  const eventOptions = requests.reduce(
    (options, request) => {
      const eventId = request.eventId || "";
      const existing = options.find((option) => option.eventId === eventId);

      if (existing) return options;

      return [
        ...options,
        {
          eventId,
          label:
            request.eventName ||
            formatDateOnly(request.eventDate) ||
            eventId ||
            "No event assigned"
        }
      ];
    },
    []
  );

  const chooseEvent = (reportName) => {
    if (eventOptions.length === 0) {
      alert("No events are available for this report.");
      return null;
    }

    const optionsText = [
      "0. All events",
      ...eventOptions.map((event, index) => `${index + 1}. ${event.label}`)
    ].join("\n");

    const answer = window.prompt(
      `Which event should the ${reportName} report include?\n\n${optionsText}`,
      "0"
    );

    if (answer === null) return null;

    const selectedIndex = Number(answer.trim());

    if (selectedIndex === 0) {
      return {
        eventId: "__all__",
        label: "All events"
      };
    }

    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 1 ||
      selectedIndex > eventOptions.length
    ) {
      alert("Please enter a valid event number.");
      return null;
    }

    return eventOptions[selectedIndex - 1];
  };

  const exportUsers = () => {
    if (!confirmExport("user", users.length)) return;

    const rows = users.map((u) => ({
      Name: u.name || "",
      Email: u.email || "",
      Phone: formatPhoneNumber(u.phone) || "",
      Address: u.address || "",
      Role: u.role || "resident",
      Approved: u.approved !== false ? "Yes" : "No",
      Active: u.active !== false ? "Yes" : "No",
      TermsAccepted: u.termsAccepted ? "Yes" : "No"
    }));

    downloadCsv("hurricane-hearts-users.csv", rows);
  };

  const exportRequests = () => {
    const selectedEvent = chooseEvent("requests");

    if (!selectedEvent) return;

    const filteredRequests =
      selectedEvent.eventId === "__all__"
        ? requests
        : requests.filter((request) => (request.eventId || "") === selectedEvent.eventId);

    if (!confirmExport("request", filteredRequests.length)) return;

    const rows = filteredRequests.map((r) => ({
      Event: r.eventName || selectedEvent.label || "",
      EventId: r.eventId || "",
      Resident: r.residentName || "",
      Email: r.residentEmail || "",
      Phone: formatPhoneNumber(r.residentPhone) || "",
      Categories: (r.categories || []).join(" | "),
      Need: r.need || "",
      Urgency: r.urgency || "",
      Status: r.status || "",
      AssignedHelper: r.assignedHelper || "",
      CompletionComment: r.completionComment || "",
      CancellationReason: r.cancellationReason || "",
      CreatedAt: formatDateTime(r.createdAt)
    }));

    downloadCsv(`hurricane-hearts-requests-${slugify(selectedEvent.label)}.csv`, rows);
  };

  const exportHistory = () => {
    const selectedEvent = chooseEvent("request history");

    if (!selectedEvent) return;

    const filteredHistory =
      selectedEvent.eventId === "__all__"
        ? requestHistory
        : requestHistory.filter((entry) => (entry.eventId || "") === selectedEvent.eventId);

    if (!confirmExport("request history", filteredHistory.length)) return;

    const rows = filteredHistory.map((h) => ({
      Event: selectedEvent.label || "",
      EventId: h.eventId || "",
      RequestId: h.requestId || "",
      Action: h.action || "",
      Details: h.details || "",
      ByName: h.byName || "",
      ByEmail: h.byEmail || "",
      CreatedAt: formatDateTime(h.createdAt)
    }));

    downloadCsv(`hurricane-hearts-request-history-${slugify(selectedEvent.label)}.csv`, rows);
  };

  return (
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-6 mb-8">
      <div className="flex flex-col items-center gap-4 mb-5 text-center">
        <div>
          <h2 className="text-2xl font-bold text-[#172033]">Reports & CSV Export</h2>
          <p className="text-sm text-[#667085]">
            Export users, requests, and request history for backup and reporting.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "12px"
        }}
      >
        <button
          onClick={exportUsers}
          className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-4 py-3 rounded-lg font-semibold text-center"
        >
          <div className="text-base font-bold mb-0.5">Export Users</div>
          <div className="text-xs opacity-90">
            Download all resident and admin account records.
          </div>
        </button>

        <button
          onClick={exportRequests}
          className="bg-[#16803c] hover:bg-[#126b32] text-white px-4 py-3 rounded-lg font-semibold text-center"
        >
          <div className="text-base font-bold mb-0.5 text-center">Export Requests</div>
          <div className="text-xs opacity-90">
            Download all requests, statuses, categories, and outcomes.
          </div>
        </button>

        <button
          onClick={exportHistory}
          className="bg-[#475467] hover:bg-[#344054] text-white px-4 py-3 rounded-lg font-semibold text-center"
        >
          <div className="text-base font-bold mb-0.5">Export Request History</div>
          <div className="text-xs opacity-90">
            Download the complete request audit timeline.
          </div>
        </button>
      </div>
    </div>
  );
}
