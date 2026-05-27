import useAuthUser from "./hooks/useAuthUser";
import useActiveEvent from "./hooks/useActiveEvent";
import useDocuments from "./hooks/useDocuments";
import useEventHistory from "./hooks/useEventHistory";
import useRequests from "./hooks/useRequests";
import useRequestHistory from "./hooks/useRequestHistory";
import useNotifications from "./hooks/useNotifications";
import useUsers from "./hooks/useUsers";
import LoginScreen from "./pages/LoginScreen";
import Dashboard from "./pages/Dashboard";
import ProfileSetup from "./components/ProfileSetup";

export default function App() {
  const { user, setUser, loading, authMessage } = useAuthUser();
  const activeEvent = useActiveEvent(!!user);
  const requests = useRequests(!!user, activeEvent?.eventId || null);
  const documents = useDocuments(!!user);
  const eventHistory = useEventHistory(!!user);
  const users = useUsers(!!user);
  const requestHistory = useRequestHistory(!!user);
  const notifications = useNotifications(user);

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

  if (!user.profileComplete) {
    return <ProfileSetup user={user} onProfileSaved={setUser} />;
  }

  return (
    <Dashboard
      user={user}
      setUser={setUser}
      activeEvent={activeEvent}
      requests={requests}
      users={users}
      documents={documents}
      requestHistory={requestHistory}
      eventHistory={eventHistory}
      notifications={notifications}
    />
  );
}