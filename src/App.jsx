import useAuthUser from "./hooks/useAuthUser";
import useActiveEvent from "./hooks/useActiveEvent";
import useDocuments from "./hooks/useDocuments";
import useEventHistory from "./hooks/useEventHistory";
import useRequests from "./hooks/useRequests";
import useRequestHistory from "./hooks/useRequestHistory";
import useNotifications from "./hooks/useNotifications";
import useUsers from "./hooks/useUsers";
import LoginScreen from "./pages/LoginScreen.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProfileSetup from "./components/ProfileSetup";
import FirstLoginTermsAcceptance from "./components/FirstLoginTermsAcceptance";
import PullToRefresh from "./components/PullToRefresh";

export default function App() {
  const { user, setUser, loading, authMessage } = useAuthUser();
  const appAccessEnabled = Boolean(user?.termsAccepted);
  const activeEvent = useActiveEvent(appAccessEnabled);
  const requests = useRequests(appAccessEnabled, activeEvent?.eventId || null);
  const documents = useDocuments(appAccessEnabled);
  const eventHistory = useEventHistory(appAccessEnabled);
  const { users, loading: usersLoading } = useUsers(appAccessEnabled);
  const requestHistory = useRequestHistory(appAccessEnabled);
  const notifications = useNotifications(appAccessEnabled ? user : null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-2xl font-semibold">
        Connecting to Hurricane Hearts...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen message={authMessage} />;
  }

  if (!user.termsAccepted && user.firstLoginTermsRequired) {
    return <FirstLoginTermsAcceptance user={user} onAccepted={setUser} />;
  }

  if (!user.profileComplete) {
    return <ProfileSetup user={user} onProfileSaved={setUser} />;
  }

  return (
    <>
      <PullToRefresh />
      <Dashboard
        user={user}
        setUser={setUser}
        activeEvent={activeEvent}
        requests={requests}
        users={users}
        usersLoading={usersLoading}
        documents={documents}
        requestHistory={requestHistory}
        eventHistory={eventHistory}
        notifications={notifications}
      />
    </>
  );
}
