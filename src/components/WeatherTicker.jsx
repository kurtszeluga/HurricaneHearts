import useNwsAlerts from "../hooks/useNwsAlerts";

function severityClass(severity) {
  if (severity === "Extreme" || severity === "Severe") {
    return "bg-red-600 text-white";
  }

  if (severity === "Moderate") {
    return "bg-yellow-100 text-yellow-900 border-yellow-300";
  }

  return "bg-blue-50 text-blue-800 border-blue-200";
}

export default function WeatherTicker({ enabled = true }) {
  const { alerts, loading, error } = useNwsAlerts(enabled);

  if (!enabled) return null;

  if (loading && alerts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-4 py-2 text-xs font-semibold">
          Loading NWS weather alerts...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl px-4 py-2 text-xs font-semibold">
          NWS weather alerts are temporarily unavailable.
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-4 py-2 text-xs font-semibold">
          NWS: No active weather alerts for the Arlington Ridge / Leesburg area.
        </div>
      </div>
    );
  }

  const tickerText = alerts
    .map((alert) => `${alert.event} — ${alert.headline}`)
    .join("     •     ");

  const highestSeverity = alerts.some((alert) => alert.severity === "Extreme" || alert.severity === "Severe")
    ? "Severe"
    : alerts.some((alert) => alert.severity === "Moderate")
      ? "Moderate"
      : "Minor";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
      <div className={`border rounded-2xl overflow-hidden text-xs font-semibold ${severityClass(highestSeverity)}`}>
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="shrink-0 font-bold">NWS ALERTS</span>
          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="inline-block animate-[marquee_35s_linear_infinite]">
              {tickerText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}