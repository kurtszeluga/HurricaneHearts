import AdminPanel from "../components/AdminPanel";
import EventAdminPanel from "../components/EventAdminPanel";
import SignupSettingsPanel from "../components/SignupSettingsPanel";

export default function AdminPage({ user, users, usersLoading = false, activeEvent }) {
  return (
    <>
      <EventAdminPanel user={user} activeEvent={activeEvent} />
      <AdminPanel user={user} users={users} usersLoading={usersLoading} />
      <SignupSettingsPanel user={user} />
    </>
  );
}
