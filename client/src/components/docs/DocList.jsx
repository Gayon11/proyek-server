// File: client/src/components/docs/DocList.jsx
// (FINAL: FORMAT TANGGAL INDO + FITUR PENCARIAN)

import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Terima prop 'searchQuery' dari MainLayout
const DocList = ({ onSelectDoc, selectedDocId, refreshTrigger, searchQuery }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://203.194.115.16:5000/api/documents", {
        headers: { "x-auth-token": token },
      });
      setDocs(res.data);
    } catch (err) {
      console.error("Gagal ambil docs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [refreshTrigger]);

  // --- LOGIKA FILTER PENCARIAN ---
  const filteredDocs = docs.filter((doc) => {
    if (!searchQuery) return true; // Jika search kosong, tampilkan semua
    // Cari berdasarkan judul dokumen (case insensitive)
    return doc.title.toLowerCase().includes(searchQuery.toLowerCase());
  });
  // ------------------------------

  return (
    <div className="sub-sidebar">
      <div className="conversation-list-header">
        <i className="bi bi-file-earmark-text"></i>
        <span>Dokumen Grup</span>
      </div>

      <div className="conversation-list">
        {loading && docs.length === 0 ? (
          <p style={{ padding: "15px" }}>Memuat...</p>
        ) : filteredDocs.length === 0 ? (
          <p style={{ padding: "15px", textAlign: "center", color: "#888" }}>{searchQuery ? "Dokumen tidak ditemukan." : "Belum ada dokumen grup."}</p>
        ) : (
          filteredDocs.map((doc) => (
            <div key={doc.doc_id} className={`conversation-item ${doc.doc_id === selectedDocId ? "active" : ""}`} onClick={() => onSelectDoc(doc)}>
              <div className="conversation-info">
                <h4>{doc.title}</h4>
                <p style={{ fontSize: "0.8rem", color: "#888" }}>
                  {format(new Date(doc.updated_at), "d MMM yyyy, HH:mm", { locale: id })} • {doc.username}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocList;
