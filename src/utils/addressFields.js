function parseLegacyAddress(address = "") {
  const parts = String(address)
    .split("|")
    .map((part) => part.trim());
  const streetPart = parts[0] || "";
  const lotPart = parts.find((part) => /^AR\s+Lot\s+/i.test(part)) || "";
  const streetMatch = streetPart.match(/^(\S+)\s+(.+)$/);
  const lotMatch = lotPart.match(/^AR\s+Lot\s+(.+)$/i);

  return {
    houseNumber: streetMatch?.[1] || "",
    streetName: streetMatch?.[2] || "",
    arLotNumber: lotMatch?.[1] || ""
  };
}

export function getAddressParts(source = {}) {
  const legacyParts = parseLegacyAddress(source.address);

  return {
    houseNumber: source.houseNumber || legacyParts.houseNumber,
    streetName: source.streetName || legacyParts.streetName,
    arLotNumber: source.arLotNumber || legacyParts.arLotNumber
  };
}

export function isAddressComplete(source = {}) {
  const parts = getAddressParts(source);

  return Boolean(
    parts.houseNumber.trim() &&
      parts.streetName.trim() &&
      parts.arLotNumber.trim()
  );
}

export function formatAddress(source = {}) {
  const parts = getAddressParts(source);
  const street = [parts.houseNumber, parts.streetName].filter(Boolean).join(" ").trim();
  const lot = parts.arLotNumber ? `AR Lot ${parts.arLotNumber}` : "";

  return [street, lot].filter(Boolean).join(" | ") || source.address || "";
}
