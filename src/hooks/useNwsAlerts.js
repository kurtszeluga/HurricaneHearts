import { useEffect, useState } from "react";

const DEFAULT_LAT = 28.74;
const DEFAULT_LON = -81.88;
const REFRESH_MS = 10 * 60 * 1000;

function simplifyAlert(feature) {
  const properties = feature.properties || {};

  return {
    id: feature.id || properties.id || `${properties.event || "alert"}-${properties.effective || Date.now()}`,
    event: properties.event || "Weather Alert",
    headline: properties.headline || "National Weather Service alert",
    severity: properties.severity || "Unknown",
    urgency: properties.urgency || "Unknown",
    areaDesc: properties.areaDesc || "",
    effective: properties.effective || "",
    expires: properties.expires || "",
    description: properties.description || "",
    instruction: properties.instruction || "",
    url: properties["@id"] || ""
  };
}

export default function useNwsAlerts(enabled, latitude = DEFAULT_LAT, longitude = DEFAULT_LON) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      return;
    }

    let cancelled = false;

    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `https://api.weather.gov/alerts/active?point=${latitude},${longitude}`,
          {
            headers: {
              Accept: "application/geo+json"
            }
          }
        );

        if (!response.ok) {
          throw new Error(`NWS request failed: ${response.status}`);
        }

        const data = await response.json();
        const features = Array.isArray(data.features) ? data.features : [];

        if (!cancelled) {
          setAlerts(features.map(simplifyAlert));
          setLastFetchedAt(new Date().toISOString());
        }
      } catch (err) {
        console.error("NWS alerts error:", err);
        if (!cancelled) {
          setError("Unable to load NWS alerts");
          setAlerts([]);
          setLastFetchedAt(new Date().toISOString());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAlerts();
    const timer = window.setInterval(loadAlerts, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    }, [enabled, latitude, longitude]);

  return { alerts, loading, error, lastFetchedAt };
}