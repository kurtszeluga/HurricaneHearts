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
        <span key={category} className="bg-red-50 text-red-700 px-2 py-1 rounded-lg text-xs font-semibold">
          {category}
        </span>
      ))}
      {(request.categories || []).length > 2 && (
        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-xs font-semibold">
          +{request.categories.length - 2}
        </span>
      )}
    </div>
  );

  const summaryButtonClass = "px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap";

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 mb-3 text-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Request Summary</h2>
            <p className="text-xs text-gray-500 leading-snug">
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
                ? "bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap"
                : "bg-gray-200 text-gray-400 px-3 py-2 rounded-xl font-semibold text-xs sm:text-sm cursor-not-allowed whitespace-nowrap"
            }
          >
            Request Assistance
          </button>
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-1.5">
          <button onClick={() => onGoToRequests({ type: "status", value: "Open" })} className={`bg-blue-50 hover:bg-blue-100 text-blue-700 ${summaryButtonClass}`}>
            Open: {openRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "status", value: "Assigned" })} className={`bg-yellow-50 hover:bg-yellow-100 text-yellow-700 ${summaryButtonClass}`}>
            Assigned: {assignedRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "special", value: "Partially Claimed" })} className={`bg-orange-50 hover:bg-orange-100 text-orange-700 ${summaryButtonClass}`}>
            Partial: {partiallyClaimedRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "status", value: "Completed" })} className={`bg-green-50 hover:bg-green-100 text-green-700 ${summaryButtonClass}`}>
            Completed: {completedRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "status", value: "Cancelled" })} className={`bg-gray-100 hover:bg-gray-200 text-gray-700 ${summaryButtonClass}`}>
            Cancelled: {cancelledRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })} className={`bg-purple-50 hover:bg-purple-100 text-purple-700 ${summaryButtonClass}`}>
            My Requests: {myRequests.length}
          </button>

          <button onClick={() => onGoToRequests({ type: "mine", value: "My Claims" })} className={`bg-indigo-50 hover:bg-indigo-100 text-indigo-700 ${summaryButtonClass}`}>
            My Claims: {myClaims.length}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 text-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">My Claims</h2>
            <p className="text-xs text-gray-500">
              Requests you have claimed or are helping with.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "mine", value: "My Claims" })}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold"
          >
            Manage My Claims
          </button>
        </div>

        {myActiveClaims.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            You do not have any active claims.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
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
                    <tr key={request.id} className="hover:bg-gray-50 align-top">
                      <td className="px-2 py-2 font-semibold text-center text-gray-900">
                        {request.residentName || "Resident"}
                      </td>
                      <td className="px-2 py-2">{categoryBadges(request)}</td>
                      <td className="px-2 py-2 text-center text-xs text-gray-700">
                        {getClaimedBy(request)}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-gray-700">
                        {myClaim ? `${myClaim.peopleProvided || 1} people` : "Assigned"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold">
                          {request.status || "Open"}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onGoToRequests({ type: "mine", value: "My Claims" })}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-lg text-xs font-semibold"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => onGoToRequests({ type: "status", value: "Assigned" })}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg text-xs font-semibold"
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

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 text-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">My Requests</h2>
            <p className="text-xs text-gray-500">
              Requests you submitted or that were submitted on your behalf.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold"
          >
            Manage My Requests
          </button>
        </div>

        {myActiveRequests.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            You do not have any active requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
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
                  <tr key={request.id} className="hover:bg-gray-50 align-top">
                    <td className="px-2 py-2">{categoryBadges(request)}</td>
                    <td className="px-2 py-2 text-center text-sm text-gray-700">{request.urgency || "Medium"}</td>
                    <td className="px-2 py-2 text-center text-xs text-gray-700 whitespace-nowrap">
                      <div>N: {request.peopleNeeded ?? "Unknown"}</div>
                      <div>C: {request.peopleCommitted || 0}</div>
                      <div>R: {request.peopleRemaining ?? "Unknown"}</div>
                    </td>
                    <td className="px-2 py-2 text-center text-xs text-gray-700">
                      {getClaimedBy(request)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold">
                        {request.status || "Open"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-lg text-xs font-semibold"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => onGoToRequests({ type: "mine", value: "My Requests" })}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg text-xs font-semibold"
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
