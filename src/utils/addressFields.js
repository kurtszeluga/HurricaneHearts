function parseLegacyAddress(address = "") {
  const [streetPart = "", cityZipPart = "", lotPart = ""] = String(address)
    .split("|")
    .map((part) => part.trim());
  const streetMatch = streetPart.match(/^(\S+)\s+(.+)$/);
  const cityZipMatch = cityZipPart.match(/^(.+?)(?:,\s*|\s+)(\d{5}(?:-\d{4})?)$/);
  const lotMatch = lotPart.match(/^AR\s+Lot\s+(.+)$/i);

  return {
    houseNumber: streetMatch?.[1] || "",
    streetName: streetMatch?.[2] || "",
    city: cityZipMatch?.[1] || "",
    zip: cityZipMatch?.[2] || "",
    arLotNumber: lotMatch?.[1] || ""
  };
}

export function getAddressParts(source = {}) {
  const legacyParts = parseLegacyAddress(source.address);

  return {
    houseNumber: source.houseNumber || legacyParts.houseNumber,
    streetName: source.streetName || legacyParts.streetName,
    city: source.city || legacyParts.city,
    zip: source.zip || legacyParts.zip,
    arLotNumber: source.arLotNumber || legacyParts.arLotNumber
  };
}

export function isAddressComplete(source = {}) {
  const parts = getAddressParts(source);

  return Boolean(
    parts.houseNumber.trim() &&
      parts.streetName.trim() &&
      parts.city.trim() &&
      parts.zip.trim() &&
      parts.arLotNumber.trim()
  );
}

export function formatAddress(source = {}) {
  const parts = getAddressParts(source);
  const street = [parts.houseNumber, parts.streetName].filter(Boolean).join(" ").trim();
  const cityZip = [parts.city, parts.zip].filter(Boolean).join(", ").trim();
  const lot = parts.arLotNumber ? `AR Lot ${parts.arLotNumber}` : "";

  return [street, cityZip, lot].filter(Boolean).join(" | ") || source.address || "";
}
