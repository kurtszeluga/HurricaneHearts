export function normalizePeopleNeeded(value) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function getPeopleCommitted(request) {
  if (typeof request.peopleCommitted === "number") {
    return request.peopleCommitted;
  }

  return (request.claimCommitments || []).reduce((sum, claim) => {
    return sum + Number(claim.peopleProvided || 0);
  }, 0);
}

export function getPeopleRemaining(request) {
  return Math.max(
    normalizePeopleNeeded(request.peopleNeeded) - getPeopleCommitted(request),
    0
  );
}
