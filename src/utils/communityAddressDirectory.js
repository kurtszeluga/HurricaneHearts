const validResidentAddresses = [
  // Add entries here when the community address list is available.
  // {
  //   houseNumber: "123",
  //   streetName: "Example Street",
  //   city: "Leesburg",
  //   zip: "34748",
  //   arLotNumber: "456"
  // }
];

function normalizeValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeLotNumber(value = "") {
  return normalizeValue(value).replace(/^ar\s*lot\s*/i, "");
}

function normalizeAddress(source = {}) {
  return {
    houseNumber: normalizeValue(source.houseNumber),
    streetName: normalizeValue(source.streetName),
    city: normalizeValue(source.city),
    zip: normalizeValue(source.zip),
    arLotNumber: normalizeLotNumber(source.arLotNumber)
  };
}

export function isCommunityAddressDirectoryConfigured() {
  return validResidentAddresses.length > 0;
}

export function findCommunityAddressMatch(source = {}) {
  if (!isCommunityAddressDirectoryConfigured()) {
    return null;
  }

  const target = normalizeAddress(source);

  return validResidentAddresses.find((entry) => {
    const current = normalizeAddress(entry);

    return (
      current.houseNumber === target.houseNumber &&
      current.streetName === target.streetName &&
      current.city === target.city &&
      current.zip === target.zip &&
      current.arLotNumber === target.arLotNumber
    );
  }) || null;
}

export function validateCommunityAddress(source = {}) {
  if (!isCommunityAddressDirectoryConfigured()) {
    return {
      configured: false,
      valid: true,
      match: null
    };
  }

  const match = findCommunityAddressMatch(source);

  return {
    configured: true,
    valid: Boolean(match),
    match
  };
}
