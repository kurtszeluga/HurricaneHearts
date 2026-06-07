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
  const appAccessEnabled = Boolean(user && !user.termsReviewRequired);
  const activeEvent = useActiveEvent(appAccessEnabled);
  const { users, loading: usersLoading } = useUsers(appAccessEnabled, user);
  const currentDirectoryUser = users.find(
    (directoryUser) =>
      directoryUser.id === user?.uid || directoryUser.uid === user?.uid
  );
  const effectiveUser = user
    ? {
        ...user,
        teamMember: currentDirectoryUser?.teamMember ?? user.teamMember ?? false,
        managedCategories:
          currentDirectoryUser?.managedCategories ?? user.managedCategories ?? []
      }
    : null;
  const requests = useRequests(
    appAccessEnabled,
    activeEvent?.eventId || null,
    effectiveUser?.teamMember === true
  );
  const documents = useDocuments(appAccessEnabled);
  const eventHistory = useEventHistory(appAccessEnabled);
  const requestHistory = useRequestHistory(
    appAccessEnabled,
    effectiveUser?.teamMember === true
  );
  const notifications = useNotifications(appAccessEnabled ? effectiveUser : null);

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

  if (user.termsReviewRequired) {
    return <FirstLoginTermsAcceptance user={user} onAccepted={setUser} />;
  }

  if (!user.profileComplete) {
    return <ProfileSetup user={user} onProfileSaved={setUser} />;
  }

  return (
    <>
      <PullToRefresh />
      <Dashboard
        user={effectiveUser}
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
