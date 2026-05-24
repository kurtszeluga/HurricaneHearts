import ReportsPanel from "../components/ReportsPanel";

export default function ReportsPage({ user, users, requests, requestHistory }) {
  return (
    <ReportsPanel
      user={user}
      users={users}
      requests={requests}
      requestHistory={requestHistory}
    />
  );
}