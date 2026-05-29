import EmailSettingsPanel from "../components/EmailSettingsPanel";
import NotificationCenter from "../components/NotificationCenter";

export default function NotificationsPage({ notifications, user }) {
  return (
    <>
      {user?.role === "admin" && <EmailSettingsPanel user={user} />}
      <NotificationCenter notifications={notifications} />
    </>
  );
}
