import EmailActivityLog from "../components/EmailActivityLog";
import EmailSettingsPanel from "../components/EmailSettingsPanel";

export default function NotificationsPage({ user }) {
  return (
    <>
      {user?.role === "admin" && (
        <>
          <EmailSettingsPanel user={user} />
          <EmailActivityLog />
        </>
      )}
    </>
  );
}
