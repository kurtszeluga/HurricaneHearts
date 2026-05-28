import { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

const documentCategories = [
  "All",
  "Emergency Info",
  "Preparation Checklist",
  "Community Guide",
  "Shelter Info",
  "Supplies",
  "Forms",
  "Event Specific",
  "Other"
];

const editableCategories = documentCategories.filter((category) => category !== "All");

function emptyForm(activeEvent) {
  return {
    title: "",
    category: "Emergency Info",
    description: "",
    url: "",
    eventSpecific: false,
    eventId: activeEvent?.eventId || "",
    eventName: activeEvent?.eventName || ""
  };
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function DocumentLibrary({ user, documents = [], activeEvent = null }) {
  const isAdmin = user.role === "admin";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [form, setForm] = useState(() => emptyForm(activeEvent));

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();

    return documents
      .filter((item) => {
        if (categoryFilter === "All") return true;
        return item.category === categoryFilter;
      })
      .filter((item) => {
        if (!term) return true;

        return (
          (item.title || "").toLowerCase().includes(term) ||
          (item.description || "").toLowerCase().includes(term) ||
          (item.category || "").toLowerCase().includes(term) ||
          (item.eventName || "").toLowerCase().includes(term)
        );
      });
  }, [documents, search, categoryFilter]);

  const startAdd = () => {
    setEditingDocument(null);
    setForm(emptyForm(activeEvent));
    setShowForm(true);
  };

  const startEdit = (item) => {
    setEditingDocument(item);
    setForm({
      title: item.title || "",
      category: item.category || "Emergency Info",
      description: item.description || "",
      url: item.url || "",
      eventSpecific: Boolean(item.eventSpecific),
      eventId: item.eventId || "",
      eventName: item.eventName || ""
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingDocument(null);
    setForm(emptyForm(activeEvent));
    setShowForm(false);
  };

  const saveDocument = async () => {
    if (!form.title.trim()) {
      alert("Please enter a document title.");
      return;
    }

    if (!form.url.trim()) {
      alert("Please enter a document link.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      url: normalizeUrl(form.url),
      eventSpecific: Boolean(form.eventSpecific),
      eventId: form.eventSpecific ? form.eventId || activeEvent?.eventId || "" : "",
      eventName: form.eventSpecific ? form.eventName || activeEvent?.eventName || "" : "",
      updatedAt: serverTimestamp(),
      updatedByUid: user.uid,
      updatedByName: user.name || user.email || "Admin"
    };

    if (form.eventSpecific && !payload.eventId) {
      alert("There is no active event to associate this document with.");
      return;
    }

    if (editingDocument) {
      const confirmed = window.confirm(`Save changes to '${form.title.trim()}'?`);
      if (!confirmed) return;

      await updateDoc(doc(db, "documents", editingDocument.id), payload);
    } else {
      const confirmed = window.confirm(`Add '${form.title.trim()}' to the document library?`);
      if (!confirmed) return;

      await addDoc(collection(db, "documents"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByName: user.name || user.email || "Admin"
      });
    }

    cancelEdit();
  };

  const removeDocument = async (item) => {
    const confirmed = window.confirm(`Delete '${item.title}' from the document library?`);
    if (!confirmed) return;

    await deleteDoc(doc(db, "documents", item.id));
  };

  return (
    <div className="bg-white rounded-3xl shadow-md p-6 mb-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center mb-5">
        <div className="hidden lg:block" aria-hidden="true" />

        <div className="text-center">
          <h2 className="text-2xl font-bold">Document Library</h2>
          <p className="text-sm text-gray-500">
            Store searchable links to emergency documents, checklists, forms, and guides.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={startAdd}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-semibold lg:justify-self-end"
          >
            Add Document Link
          </button>
        )}
      </div>

      <div className="bg-gray-50 rounded-3xl p-4 mb-5 grid md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents"
          className="border rounded-2xl px-4 py-3 bg-white md:col-span-2"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-2xl px-4 py-3 bg-white"
        >
          {documentCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {showForm && isAdmin && (
        <div className="bg-gray-50 border rounded-3xl p-5 mb-6">
          <h3 className="text-xl font-bold mb-4">
            {editingDocument ? "Edit Document" : "Add Document"}
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Document title"
              className="border rounded-2xl p-4 bg-white"
            />

            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border rounded-2xl p-4 bg-white"
            >
              {editableCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="Document link / URL"
              className="border rounded-2xl p-4 bg-white md:col-span-2"
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description"
              className="border rounded-2xl p-4 bg-white md:col-span-2 min-h-[100px]"
            />
          </div>

          <label className="flex items-center gap-2 mt-4 font-semibold text-sm">
            <input
              type="checkbox"
              checked={form.eventSpecific}
              onChange={(e) =>
                setForm({
                  ...form,
                  eventSpecific: e.target.checked,
                  eventId: e.target.checked ? activeEvent?.eventId || "" : "",
                  eventName: e.target.checked ? activeEvent?.eventName || "" : ""
                })
              }
            />
            This document is specific to the active event
          </label>

          {form.eventSpecific && (
            <div className="bg-blue-50 text-blue-800 rounded-2xl p-4 mt-3 text-sm font-semibold">
              {activeEvent
                ? `Linked to event: ${activeEvent.eventName} — ${activeEvent.eventDate}`
                : "No active event is available. Activate an event first or uncheck this option."}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={saveDocument}
              className="bg-red-600 text-white px-5 py-3 rounded-2xl font-semibold"
            >
              Save Document
            </button>

            <button
              onClick={cancelEdit}
              className="bg-gray-100 text-gray-700 px-5 py-3 rounded-2xl font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No documents match your search.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredDocuments.map((item) => (
            <div key={item.id} className="border rounded-3xl p-5 bg-gray-50">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                    {item.category || "Document"}
                  </div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  {item.eventSpecific && (
                    <div className="text-xs text-blue-700 font-semibold mt-1">
                      Event: {item.eventName || "Event-specific"}
                    </div>
                  )}
                </div>
              </div>

              {item.description && (
                <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                  {item.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold"
                >
                  Open Document
                </a>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-xl font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => removeDocument(item)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl font-semibold"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
