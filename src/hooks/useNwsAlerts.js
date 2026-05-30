import { useEffect, useState } from "react";

const DEFAULT_LAT = 28.74;
const DEFAULT_LON = -81.88;
const REFRESH_MS = 10 * 60 * 1000;

function firstParameterValue(parameters, key) {
  const value = parameters?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

function getStatementUrl(feature, properties) {
  const apiUrl = properties["@id"] || feature.id || "";
  const awipsIdentifier = firstParameterValue(properties.parameters, "AWIPSidentifier");

  if (/^[A-Z0-9]{6}$/.test(awipsIdentifier)) {
    const product = awipsIdentifier.slice(0, 3);
    const issuedBy = awipsIdentifier.slice(3);
    const searchParams = new URLSearchParams({
      site: "NWS",
      issuedby: issuedBy,
      product,
      format: "CI",
      version: "1",
      glossary: "0"
    });

    return `https://forecast.weather.gov/product.php?${searchParams.toString()}`;
  }

  return apiUrl;
}

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
    apiUrl: properties["@id"] || feature.id || "",
    url: getStatementUrl(feature, properties)
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
