import UserDirectory from "../components/UserDirectory";

export default function DirectoryPage({ user, users }) {
  return <UserDirectory user={user} users={users} />;
}
