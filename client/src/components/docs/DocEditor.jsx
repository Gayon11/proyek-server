// File: client/src/components/docs/DocEditor.jsx
// (FINAL: DENGAN SOCKET TERPUSAT & PEMBATASAN HAK AKSES ROLE)

import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import axios from "axios";
import socket from "../../socket";
import "./DocEditor.css";
import { useAuth } from "../../context/AuthContext"; // <-- 1. Import useAuth

const DocEditor = ({ selectedDoc, onDocSaved, onDocDeleted }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useAuth(); // <-- 2. Ambil data user

  // 3. Cek Role: Hanya Owner & HRD yang bisa edit/hapus
  const canEdit = user && (user.role === "owner" || user.role === "hrd");

  useEffect(() => {
    if (selectedDoc) {
      setTitle(selectedDoc.title);
      setContent(selectedDoc.content || "");
    } else {
      setTitle("");
      setContent("");
    }
  }, [selectedDoc]);

  const handleSave = async () => {
    if (!title.trim()) return alert("Judul tidak boleh kosong");

    setIsSaving(true);
    const token = localStorage.getItem("token");

    try {
      if (selectedDoc && selectedDoc.doc_id) {
        // UPDATE
        await axios.put(`https://203.194.115.16.nip.io/api/documents/${selectedDoc.doc_id}`, { title, content }, { headers: { "x-auth-token": token } });

        socket.emit("docSaved", {
          docId: selectedDoc.doc_id,
          title,
          content,
        });
      } else {
        // CREATE
        const res = await axios.post(`https://203.194.115.16.nip.io/api/documents`, { title, content }, { headers: { "x-auth-token": token } });
        const newDoc = res.data;
        socket.emit("docCreated", newDoc);
      }

      alert("Dokumen tersimpan!");
      onDocSaved();
    } catch (err) {
      console.error("Error saving doc:", err);
      alert("Gagal menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc || !selectedDoc.doc_id) return;

    if (!window.confirm(`Yakin ingin menghapus dokumen "${title}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://203.194.115.16.nip.io/api/documents/${selectedDoc.doc_id}`, {
        headers: { "x-auth-token": token },
      });

      socket.emit("docDeleted", { docId: selectedDoc.doc_id });

      onDocDeleted();
    } catch (err) {
      console.error("Gagal menghapus:", err);
      alert("Gagal menghapus dokumen.");
    }
  };

  return (
    <div className="doc-editor-container">
      <div className="doc-header">
        <input
          type="text"
          className="doc-title-input"
          placeholder="Judul Dokumen Tanpa Nama"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit} // <-- Disable input judul untuk staf
        />

        <div className="doc-actions">
          {/* TOMBOL HAPUS (Hanya jika canEdit & dokumen ada) */}
          {canEdit && selectedDoc && selectedDoc.doc_id && (
            <button className="delete-doc-btn" onClick={handleDelete}>
              Hapus
            </button>
          )}

          {/* TOMBOL SIMPAN (Hanya jika canEdit) */}
          {canEdit && (
            <button className="save-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Menyimpan..." : "Simpan"}
            </button>
          )}
        </div>
      </div>

      <div className="editor-wrapper">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          className="quill-editor"
          placeholder={canEdit ? "Mulai mengetik dokumen..." : "Mode hanya baca (Read-only)..."} // Placeholder dinamis
          readOnly={!canEdit} // <-- Set Read-Only untuk staf
        />
      </div>
    </div>
  );
};

export default DocEditor;
