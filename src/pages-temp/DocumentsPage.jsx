import DocumentLibrary from "../components/DocumentLibrary";

export default function DocumentsPage({ user, documents, activeEvent }) {
  return <DocumentLibrary user={user} documents={documents} activeEvent={activeEvent} />;
}