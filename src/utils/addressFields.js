export function getAddressParts(source = {}) {
  return {
    houseNumber: source.houseNumber || "",
    streetName: source.streetName || "",
    city: source.city || "",
    zip: source.zip || "",
    arLotNumber: source.arLotNumber || ""
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
