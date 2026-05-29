import EmailActivityLog from "../components/EmailActivityLog";
import EmailSettingsPanel from "../components/EmailSettingsPanel";
import NotificationCenter from "../components/NotificationCenter";

export default function NotificationsPage({ notifications, user }) {
  return (
    <>
      {user?.role === "admin" && (
        <>
          <EmailSettingsPanel user={user} />
          <EmailActivityLog />
        </>
      )}
      <NotificationCenter notifications={notifications} />
    </>
  );
}
