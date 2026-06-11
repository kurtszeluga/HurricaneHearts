export function isOpenRequestStatus(status) {
  return status === "Open" || status === "Re-Opened";
}

export function getRequestDisplayStatus(request) {
  const peopleNeeded = Number(request.peopleNeeded);
  const peopleCommitted =
    typeof request.peopleCommitted === "number"
      ? request.peopleCommitted
      : (request.claimCommitments || []).reduce(
          (sum, claim) => sum + Number(claim.peopleProvided || 0),
          0
        );

  if (
    request.status === "Open" &&
    peopleCommitted > 0 &&
    Number.isFinite(peopleNeeded) &&
    peopleCommitted < peopleNeeded
  ) {
    return "Re-Opened";
  }

  return request.status || "Open";
}

export function getRequestStatusClass(status) {
  if (status === "Re-Opened") {
    return "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]";
  }

  return "bg-[#f2f4f7] text-[#344054]";
}
