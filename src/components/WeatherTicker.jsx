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
  const { alerts, loading, error, lastFetchedAt } = useNwsAlerts(enabled);

  if (!enabled) return null;

  if (loading && alerts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div>Loading NWS weather alerts...</div>
          <div className="text-[10px] opacity-90">{lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div>NWS weather alerts are temporarily unavailable.</div>
          <div className="text-[10px] opacity-90">{lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}</div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div>NWS: No active weather alerts for the Arlington Ridge / Leesburg area.</div>
          <div className="text-[10px] opacity-90">{lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}</div>
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

  const repeated = `${tickerText}     •     ${tickerText}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
      <div className={`border rounded-2xl overflow-hidden text-xs font-semibold ${severityClass(highestSeverity)}`}>
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="shrink-0 font-bold">NWS ALERTS</span>

          <div className="overflow-hidden flex-1">
            <div className="whitespace-nowrap" style={{ display: 'inline-block', minWidth: '100%' }}>
              <div style={{ display: 'inline-block', animation: 'marquee 35s linear infinite' }}>
                {repeated}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-[10px] opacity-90 ml-3">
            {lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}