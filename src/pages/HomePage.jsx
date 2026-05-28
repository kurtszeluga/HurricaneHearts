export default function HomePage({
  user,
  activeEvent,
  requests,
  onNewRequest,
  onGoToRequests
}) {
  const myRequests = requests.filter((r) => r.residentUid === user.uid || r.residentEmail === user.email);
  const myClaims = requests.filter((r) => {
    const userIds = [user.uid, user.id].filter(Boolean);

    return (
      userIds.includes(r.assignedHelperUid) ||
      (r.claimCommitments || []).some((claim) => {
        return (
          userIds.includes(claim.uid) ||
          userIds.includes(claim.claimedByUid) ||
          claim.email === user.email
        );
      })
    );
  });

  const openRequests = requests.filter((r) => r.status === "Open");
  const assignedRequests = requests.filter((r) => r.status === "Assigned");
  const partiallyClaimedRequests = requests.filter(
    (r) => r.status === "Open" && Number(r.peopleCommitted || 0) > 0
  );
  const completedRequests = requests.filter((r) => r.status === "Completed");
  const cancelledRequests = requests.filter((r) => r.status === "Cancelled");

  const myActiveClaims = myClaims.filter((request) => {
    return request.status !== "Completed" && request.status !== "Cancelled";
  });

  const myActiveRequests = myRequests.filter((request) => {
    return request.status !== "Completed" && request.status !== "Cancelled";
  });

  const getMyClaim = (request) => {
    const userIds = [user.uid, user.id].filter(Boolean);

    return (request.claimCommitments || []).find((claim) => {
      return (
        userIds.includes(claim.uid) ||
        userIds.includes(claim.claimedByUid) ||
        claim.email === user.email
      );
    }) || null;
  };

  const getClaimedBy = (request) => {
    if (request.assignedHelper) return request.assignedHelper;
    if (request.assignedHelperName) return request.assignedHelperName;

    const claimNames = (request.claimCommitments || [])
      .map((claim) => claim.name || claim.helperName || claim.email)
      .filter(Boolean);

    return claimNames.length > 0 ? claimNames.join(", ") : "—";
  };

  const categoryBadges = (request) => (
    <div className="flex flex-wrap justify-center gap-1 max-w-[220px] mx-auto">
      {(request.categories || []).slice(0, 2).map((category) => (
        <span key={category} className="bg-[#fff1f0] text-[#b42318] border border-[#fecdca] px-2 py-1 rounded-md text-xs font-semibold">
          {category}
        </span>
      ))}
      {(request.categories || []).length > 2 && (
        <span className="bg-[#f2f4f7] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold">
          +{request.categories.length - 2}
        </span>
      )}
    </div>
  );

  const summaryButtonClass = "px-2.5 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold whitespace-nowrap border";

  return (
    <div className="space-y-3">
      <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 mb-3 text-center">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">Request Summary</h2>
            <p className="text-xs text-[#667085] leading-snug">
              {activeEvent
                ? `Active Event: ${activeEvent.eventName} — ${activeEvent.eventDate}`
                : "No event is active. Request assistance is currently disabled."}
            </p>
          </div>

          <button
            type="button"
            onClick={onNewRequest}
            disabled={!activeEvent}
            className={
              activeEvent
                ? "bg-[#b42318] hover:bg-[#9f1f16] text-white px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm whitespace-nowrap"
                : "bg-[#e2e8f0] text-[#98a2b3] px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm cursor-not-allowed whitespace-nowrap"
            }
          >
            Request Assistance
          </button>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-1.5">
          <button onClick={() => onGoToRequests({ type: "status", value: "Open" })} className={`bg-[#eff6ff] hover:bg-[#dbeafe] border-[#bfdbfe] text-[#1d4ed8] ${summaryButtonClass}`}>
            Open: {openRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "status", value: "Assigned" })} className={`bg-[#fffbeb] hover:bg-[#fef3c7] border-[#fde68a] text-[#92400e] ${summaryButtonClass}`}>
            Assigned: {assignedRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "special", value: "Partially Claimed" })} className={`bg-[#fff7ed] hover:bg-[#ffedd5] border-[#fed7aa] text-[#9a3412] ${summaryButtonClass}`}>
            Partial: {partiallyClaimedRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "status", value: "Completed" })} className={`bg-[#ecfdf3] hover:bg-[#dcfae6] border-[#abefc6] text-[#067647] ${summaryButtonClass}`}>
            Completed: {completedRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "status", value: "Cancelled" })} className={`bg-[#f2f4f7] hover:bg-[#d8e0ea] border-[#c7d0dc] text-[#475467] ${summaryButtonClass}`}>
            Cancelled: {cancelledRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })} className={`bg-[#f1f5f9] hover:bg-[#e2e8f0] border-[#c7d0dc] text-[#1f3a5f] ${summaryButtonClass}`}>
            My Requests: {myRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "mine", value: "My Claims" })} className={`bg-[#f1f5f9] hover:bg-[#e2e8f0] border-[#c7d0dc] text-[#1f3a5f] ${summaryButtonClass}`}>
            My Claims: {myClaims.length}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm overflow-hidden">
        <div className="px-3 py-2 bg-[#f1f5f9] border-b border-[#c7d0dc] flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 text-center">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">My Claims</h2>
            <p className="text-xs text-[#667085]">
              Requests you have claimed or are helping with.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "mine", value: "My Claims" })}
            className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg text-xs font-semibold"
          >
            Manage My Claims
          </button>
        </div>

        {myActiveClaims.length === 0 ? (
          <div className="p-4 text-sm text-[#667085] text-center">
            You do not have any active claims.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f5f9] border-b border-[#c7d0dc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="text-center px-2 py-2 font-bold min-w-[140px]">Resident</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[150px]">Category</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[120px]">Claimed By</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[100px]">My Claim</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[100px]">Status</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[140px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {myActiveClaims.map((request) => {
                  const myClaim = getMyClaim(request);

                  return (
                    <tr key={request.id} className="hover:bg-[#f1f5f9] align-top">
                      <td className="px-2 py-2 font-semibold text-center text-[#172033]">
                        {request.residentName || "Resident"}
                      </td>
                      <td className="px-2 py-2">{categoryBadges(request)}</td>
                      <td className="px-2 py-2 text-center text-xs text-[#475467]">
                        {getClaimedBy(request)}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-[#475467]">
                        {myClaim ? `${myClaim.peopleProvided || 1} people` : "Assigned"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex px-2 py-1 rounded-full bg-[#f2f4f7] text-[#344054] text-xs font-bold">
                          {request.status || "Open"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onGoToRequests({ type: "mine", value: "My Claims" })}
                            className="bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] px-2 py-1 rounded-md text-xs font-semibold"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onGoToRequests({ type: "status", value: "Assigned" })}
                            className="bg-[#ecfdf3] hover:bg-[#dcfae6] border border-[#abefc6] text-[#067647] px-2 py-1 rounded-md text-xs font-semibold"
                          >
                            Complete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm overflow-hidden">
        <div className="px-3 py-2 bg-[#f1f5f9] border-b border-[#c7d0dc] flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 text-center">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">My Requests</h2>
            <p className="text-xs text-[#667085]">
              Requests you submitted or that were submitted on your behalf.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
            className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg text-xs font-semibold"
          >
            Manage My Requests
          </button>
        </div>

        {myActiveRequests.length === 0 ? (
          <div className="p-4 text-sm text-[#667085] text-center">
            You do not have any active requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f1f5f9] border-b border-[#c7d0dc] text-xs uppercase text-[#667085]">
                <tr>
                  <th className="text-center px-2 py-2 font-bold min-w-[130px]">Category</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">Urgency</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">People</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[110px]">Claimed By</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[90px]">Status</th>
                  <th className="text-center px-2 py-2 font-bold min-w-[120px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {myActiveRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-[#f1f5f9] align-top">
                    <td className="px-2 py-2">{categoryBadges(request)}</td>
                    <td className="px-2 py-2 text-center text-sm text-[#475467]">{request.urgency || "Medium"}</td>
                    <td className="px-2 py-2 text-center text-xs text-[#475467] whitespace-nowrap">
                      <div>N: {request.peopleNeeded ?? "Unknown"}</div>
                      <div>C: {request.peopleCommitted || 0}</div>
                      <div>R: {request.peopleRemaining ?? "Unknown"}</div>
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-[#475467]">
                      {getClaimedBy(request)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex px-2 py-1 rounded-full bg-[#f2f4f7] text-[#344054] text-xs font-bold">
                        {request.status || "Open"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
                          className="bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#1d4ed8] px-2 py-1 rounded-md text-xs font-semibold"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
                          className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-2 py-1 rounded-md text-xs font-semibold"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
