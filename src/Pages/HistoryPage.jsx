export default function HomePage({
  user,
  activeEvent,
  requests,
  onNewRequest,
  onEditProfile,
  onGoToRequests,
  onGoToDirectory
}) {
  const myRequests = requests.filter((r) => r.residentUid === user.uid);
  const myClaims = requests.filter((r) => {
    return r.assignedHelperUid === user.uid ||
      (r.claimCommitments || []).some((claim) => claim.uid === user.uid);
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

  const getMyClaim = (request) => {
    return (request.claimCommitments || []).find((claim) => claim.uid === user.uid) || null;
  };

  return (
    <div className="space-y-3">
      <div className="grid xl:grid-cols-[1.45fr_0.9fr] gap-3 items-start">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Quick Actions</h2>
              <p className="text-xs text-gray-500 leading-snug">
                {activeEvent
                  ? `Active Event: ${activeEvent.eventName} — ${activeEvent.eventDate}`
                  : "No event is active. You may still edit your profile and search the directory."}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onNewRequest}
              disabled={!activeEvent}
              className={
                activeEvent
                  ? "bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded-xl font-semibold text-center text-xs sm:text-sm leading-tight whitespace-normal break-words min-h-[44px]"
                  : "bg-gray-200 text-gray-400 px-2 py-2 rounded-xl font-semibold text-center text-xs sm:text-sm leading-tight whitespace-normal break-words min-h-[44px] cursor-not-allowed"
              }
            >
              Request Assistance
            </button>

            <button
              type="button"
              onClick={() => onGoToRequests("Open")}
              className="bg-white hover:bg-gray-50 text-gray-800 px-2 py-2 rounded-xl font-semibold border text-center text-xs sm:text-sm leading-tight whitespace-normal break-words min-h-[44px]"
            >
              View Requests
            </button>

            <button
              type="button"
              onClick={onGoToDirectory}
              className="bg-white hover:bg-gray-50 text-gray-800 px-2 py-2 rounded-xl font-semibold border text-center text-xs sm:text-sm leading-tight whitespace-normal break-words min-h-[44px]"
            >
              Resident Directory
            </button>

            <button
              type="button"
              onClick={onEditProfile}
              className="bg-white hover:bg-gray-50 text-gray-800 px-2 py-2 rounded-xl font-semibold border text-center text-xs sm:text-sm leading-tight whitespace-normal break-words min-h-[44px]"
            >
              Edit My Profile
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Request Summary</h2>

          <div className="space-y-1 text-sm">
            <button onClick={() => onGoToRequests("Open")} className="w-full flex items-center justify-between border-b py-1 hover:text-red-700">
              <span>Open</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-bold text-xs">{openRequests.length}</span>
            </button>

            <button onClick={() => onGoToRequests("Assigned")} className="w-full flex items-center justify-between border-b py-1 hover:text-red-700">
              <span>Assigned</span>
              <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-lg font-bold text-xs">{assignedRequests.length}</span>
            </button>

            <button onClick={() => onGoToRequests("Open")} className="w-full flex items-center justify-between border-b py-1 hover:text-red-700">
              <span>Partially Claimed</span>
              <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-bold text-xs">{partiallyClaimedRequests.length}</span>
            </button>

            <button onClick={() => onGoToRequests("Completed")} className="w-full flex items-center justify-between border-b py-1 hover:text-red-700">
              <span>Completed</span>
              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg font-bold text-xs">{completedRequests.length}</span>
            </button>

            <button onClick={() => onGoToRequests("Cancelled")} className="w-full flex items-center justify-between border-b py-1 hover:text-red-700">
              <span>Cancelled</span>
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg font-bold text-xs">{cancelledRequests.length}</span>
            </button>

            <button onClick={() => onGoToRequests("All")} className="w-full flex items-center justify-between border-b py-1 hover:text-red-700">
              <span>My Requests</span>
              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg font-bold text-xs">{myRequests.length}</span>
            </button>

            <button onClick={() => onGoToRequests("All")} className="w-full flex items-center justify-between pt-1 hover:text-red-700">
              <span>My Claims</span>
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold text-xs">{myClaims.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">My Claims</h2>
            <p className="text-xs text-gray-500">
              Requests you have claimed or are helping with.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onGoToRequests("All")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold"
          >
            Manage All Claims
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
                  <th className="text-left px-2 py-2 font-bold min-w-[140px]">Resident</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[150px]">Category</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[100px]">My Claim</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[100px]">Status</th>
                  <th className="text-left px-2 py-2 font-bold min-w-[180px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {myActiveClaims.map((request) => {
                  const myClaim = getMyClaim(request);

                  return (
                    <tr key={request.id} className="hover:bg-gray-50 align-top">
                      <td className="px-2 py-2 font-semibold text-gray-900">
                        {request.residentName || "Resident"}
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
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
                      </td>

                      <td className="px-2 py-2 text-xs text-gray-700">
                        {myClaim ? `${myClaim.peopleProvided || 1} people` : "Assigned"}
                      </td>

                      <td className="px-2 py-2">
                        <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-bold">
                          {request.status || "Open"}
                        </span>
                      </td>

                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => onGoToRequests("All")}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-lg text-xs font-semibold"
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() => onGoToRequests("Assigned")}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg text-xs font-semibold"
                          >
                            Complete
                          </button>

                          <button
                            type="button"
                            onClick={() => onGoToRequests("All")}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg text-xs font-semibold"
                          >
                            Manage
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
    </div>
  );
}