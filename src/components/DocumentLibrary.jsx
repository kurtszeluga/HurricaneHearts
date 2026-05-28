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
    <div className="bg-white border border-[#c7d0dc] rounded-lg shadow-sm p-6 mb-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center mb-5">
        <div className="hidden lg:block" aria-hidden="true" />

        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#172033]">Document Library</h2>
          <p className="text-sm text-[#667085]">
            Store searchable links to emergency documents, checklists, forms, and guides.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={startAdd}
            className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-4 py-2.5 rounded-lg font-semibold lg:justify-self-end"
          >
            Add Document Link
          </button>
        )}
      </div>

      <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-4 mb-5 grid md:grid-cols-3 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents"
          className="border border-[#c7d0dc] rounded-lg px-4 py-3 bg-white md:col-span-2"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-[#c7d0dc] rounded-lg px-4 py-3 bg-white"
        >
          {documentCategories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {showForm && isAdmin && (
        <div className="bg-[#f1f5f9] border border-[#c7d0dc] rounded-lg p-5 mb-6">
          <h3 className="text-xl font-bold text-[#172033] mb-4">
            {editingDocument ? "Edit Document" : "Add Document"}
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Document title"
              className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white"
            />

            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white"
            >
              {editableCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="Document link / URL"
              className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white md:col-span-2"
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description"
              className="border border-[#c7d0dc] rounded-lg p-3.5 bg-white md:col-span-2 min-h-[100px]"
            />
          </div>

          <label className="flex items-center gap-2 mt-4 font-semibold text-sm text-[#344054]">
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
            <div className="bg-[#eff6ff] text-[#1e3a8a] border border-[#bfdbfe] rounded-lg p-4 mt-3 text-sm font-semibold">
              {activeEvent
                ? `Linked to event: ${activeEvent.eventName} — ${activeEvent.eventDate}`
                : "No active event is available. Activate an event first or uncheck this option."}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={saveDocument}
              className="bg-[#b42318] hover:bg-[#9f1f16] text-white px-4 py-2.5 rounded-lg font-semibold"
            >
              Save Document
            </button>

            <button
              onClick={cancelEdit}
              className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-4 py-2.5 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <div className="text-center text-[#667085] py-8 border border-dashed border-[#c7d0dc] rounded-lg bg-[#f1f5f9]">
          No documents match your search.
        </div>
      ) : (
        <div className="overflow-hidden border border-[#c7d0dc] rounded-lg">
          {filteredDocuments.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 border-b border-[#d8e0ea] bg-white p-4 last:border-b-0 md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#667085] uppercase mb-1">
                    {item.category || "Document"}
                </div>
                <h3 className="text-lg font-bold text-[#172033]">{item.title}</h3>
                  {item.eventSpecific && (
                    <div className="text-xs text-[#1d4ed8] font-semibold mt-1">
                      Event: {item.eventName || "Event-specific"}
                    </div>
                  )}

              {item.description && (
                <p className="text-sm text-[#475467] mt-2 whitespace-pre-wrap">
                  {item.description}
                </p>
              )}
              </div>

              <div className="flex flex-wrap items-start justify-start gap-2 md:justify-end">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#1f3a5f] hover:bg-[#172b46] text-white px-3 py-2 rounded-lg text-sm font-semibold"
                >
                  Open Document
                </a>

                {isAdmin && (
                  <>
                    <button
                      onClick={() => startEdit(item)}
                      className="bg-white hover:bg-[#e2e8f0] border border-[#c7d0dc] text-[#475467] px-3 py-2 rounded-lg text-sm font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => removeDocument(item)}
                      className="bg-[#fff1f0] hover:bg-[#fee4e2] border border-[#fecdca] text-[#b42318] px-3 py-2 rounded-lg text-sm font-semibold"
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
