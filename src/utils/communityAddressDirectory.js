function normalizeValue(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeLotNumber(value = "") {
  return normalizeValue(value).replace(/^ar\s*lot\s*/i, "");
}

export function normalizeCommunityAddress(source = {}) {
  return {
    houseNumber: normalizeValue(source.houseNumber),
    streetName: normalizeValue(source.streetName),
    city: normalizeValue(source.city),
    zip: normalizeValue(source.zip),
    arLotNumber: normalizeLotNumber(source.arLotNumber)
  };
}

function parseCsvLine(line = "") {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && insideQuotes && nextCharacter === "\"") {
      current += "\"";
      index += 1;
    } else if (character === "\"") {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current.trim());

  return cells;
}

function normalizeHeader(value = "") {
  return normalizeValue(value).replace(/[^a-z0-9]/g, "");
}

const headerAliases = {
  housenumber: "houseNumber",
  house: "houseNumber",
  streetnumber: "houseNumber",
  streetname: "streetName",
  street: "streetName",
  city: "city",
  zip: "zip",
  zipcode: "zip",
  arlotnumber: "arLotNumber",
  arlot: "arLotNumber",
  lotnumber: "arLotNumber",
  lot: "arLotNumber"
};

export function parseCommunityAddressCsv(csvText = "") {
  const rows = String(csvText)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line, index) => ({
      line,
      rowNumber: index + 1,
      cells: parseCsvLine(line)
    }))
    .filter((row) => row.cells.some((cell) => cell.trim()));

  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one address row.");
  }

  const headers = rows[0].cells.map((header) => {
    return headerAliases[normalizeHeader(header)] || "";
  });
  const requiredFields = ["houseNumber", "streetName", "city", "zip", "arLotNumber"];
  const missingFields = requiredFields.filter((field) => !headers.includes(field));

  if (missingFields.length > 0) {
    throw new Error(
      "CSV is missing required columns: houseNumber, streetName, city, zip, arLotNumber."
    );
  }

  const addressRows = [];

  for (const csvRow of rows.slice(1)) {
    const cells = csvRow.cells;
    const row = {};

    headers.forEach((field, cellIndex) => {
      if (field) {
        row[field] = cells[cellIndex] || "";
      }
    });

    const normalized = normalizeCommunityAddress(row);

    if (!normalized.houseNumber) {
      break;
    }

    if (
      !normalized.streetName ||
      !normalized.city ||
      !normalized.zip ||
      !normalized.arLotNumber
    ) {
      throw new Error(`CSV row ${csvRow.rowNumber} is missing required address data.`);
    }

    addressRows.push({
      houseNumber: row.houseNumber.trim(),
      streetName: row.streetName.trim(),
      city: row.city.trim(),
      zip: row.zip.trim(),
      arLotNumber: row.arLotNumber.trim()
    });
  }

  if (addressRows.length === 0) {
    throw new Error("CSV must include at least one address row with a house number.");
  }

  return addressRows;
}

export function findCommunityAddressMatch(source = {}, directory = []) {
  const target = normalizeCommunityAddress(source);

  return directory.find((entry) => {
    const current = normalizeCommunityAddress(entry);

    return (
      current.houseNumber === target.houseNumber &&
      current.streetName === target.streetName &&
      current.city === target.city &&
      current.zip === target.zip &&
      current.arLotNumber === target.arLotNumber
    );
  }) || null;
}

export function validateCommunityAddress(source = {}, directory = []) {
  if (!Array.isArray(directory) || directory.length === 0) {
    return {
      configured: false,
      valid: true,
      match: null
    };
  }

  const match = findCommunityAddressMatch(source, directory);

  return {
    configured: true,
    valid: Boolean(match),
    match
  };
}
