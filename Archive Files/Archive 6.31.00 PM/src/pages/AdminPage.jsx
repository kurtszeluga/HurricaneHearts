import AdminPanel from "../components/AdminPanel";
import EventAdminPanel from "../components/EventAdminPanel";

export default function AdminPage({ user, users, activeEvent }) {
  return (
    <>
      <EventAdminPanel user={user} activeEvent={activeEvent} />
      <AdminPanel user={user} users={users} />
    </>
  );
}