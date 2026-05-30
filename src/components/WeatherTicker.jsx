import useNwsAlerts from "../hooks/useNwsAlerts";

function severityClass(severity) {
  if (severity === "Extreme" || severity === "Severe") {
    return "bg-[#b42318] text-white border-[#9f1f16]";
  }

  if (severity === "Moderate") {
    return "bg-[#fffbeb] text-[#92400e] border-[#fde68a]";
  }

  return "bg-[#eff6ff] text-[#1e3a8a] border-[#bfdbfe]";
}

function renderTickerRun(alerts, isDuplicate = false) {
  return alerts.map((alert, index) => {
    const text = `${alert.event} — ${alert.headline}`;
    const content = alert.url ? (
      <a
        className="nws-marquee-link"
        href={alert.url}
        target="_blank"
        rel="noreferrer"
        tabIndex={isDuplicate ? -1 : undefined}
      >
        {text}
      </a>
    ) : (
      <span>{text}</span>
    );

    return (
      <span className="nws-marquee-item" key={`${isDuplicate ? "duplicate" : "primary"}-${alert.id}`}>
        {index > 0 ? <span className="nws-marquee-separator" aria-hidden="true">•</span> : null}
        {content}
      </span>
    );
  });
}

export default function WeatherTicker({ enabled = true }) {
  const { alerts, loading, error, lastFetchedAt } = useNwsAlerts(enabled);

  if (!enabled) return null;

  if (loading && alerts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-[#eff6ff] border border-[#bfdbfe] text-[#1e3a8a] rounded-lg px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div>Loading NWS weather alerts...</div>
          <div className="text-[10px] opacity-90">{lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-white/8 border border-white/15 text-slate-200 rounded-lg px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div>NWS weather alerts are temporarily unavailable.</div>
          <div className="text-[10px] opacity-90">{lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}</div>
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-[#ecfdf3] border border-[#abefc6] text-[#067647] rounded-lg px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div>NWS: No active weather alerts for the Arlington Ridge / Leesburg area.</div>
          <div className="text-[10px] opacity-90">{lastFetchedAt ? `Updated: ${new Date(lastFetchedAt).toLocaleString()}` : ""}</div>
        </div>
      </div>
    );
  }

  const highestSeverity = alerts.some((alert) => alert.severity === "Extreme" || alert.severity === "Severe")
    ? "Severe"
    : alerts.some((alert) => alert.severity === "Moderate")
      ? "Moderate"
      : "Minor";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
      <div className={`border rounded-lg overflow-hidden text-xs font-semibold ${severityClass(highestSeverity)}`}>
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="shrink-0 font-bold">NWS ALERTS</span>

          <div className="overflow-hidden flex-1">
            <div className="nws-marquee-track">
              <span className="nws-marquee-run">{renderTickerRun(alerts)}</span>
              <span className="nws-marquee-run" aria-hidden="true">{renderTickerRun(alerts, true)}</span>
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
