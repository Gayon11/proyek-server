// File: client/src/components/files/FileList.jsx
// (DIUPDATE: KLIK KARTU UNTUK BUKA FILE)

import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import "./FileList.css";

const FileList = ({ channelId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    const fetchFiles = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`https://203.194.115.16.nip.io/api/channels/${channelId}/files`, {
          headers: { "x-auth-token": token },
        });
        setFiles(res.data);
      } catch (err) {
        console.error("Gagal ambil file:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [channelId]);

  // Fungsi helper untuk membuka file
  const openFile = (url) => {
    // Membuka file di tab baru (browser akan otomatis download atau menampilkan pdf/gambar)
    window.open(`https://203.194.115.16.nip.io${url}`, "_blank");
  };

  if (!channelId) {
    return (
      <div className="file-placeholder">
        <span role="img" aria-label="folder" style={{ fontSize: "50px" }}>
          📂
        </span>
        <h3>Pilih obrolan untuk melihat file</h3>
      </div>
    );
  }

  if (loading) return <div className="file-loading">Memuat file...</div>;

  return (
    <div className="file-gallery-container">
      <div className="file-header">
        <h3>Kumpulan File</h3>
        <span className="file-count">{files.length} File ditemukan</span>
      </div>

      <div className="file-grid">
        {files.length === 0 ? (
          <p className="no-files">Tidak ada file di obrolan ini.</p>
        ) : (
          files.map((file) => (
            // 1. PINDAHKAN ONCLICK KE WRAPPER UTAMA (CARD)
            <div
              key={file.message_id}
              className="file-card"
              onClick={() => openFile(file.file_url)} // <-- Klik di sini
              title="Klik untuk membuka/download"
            >
              {/* Preview Gambar */}
              {file.file_type === "image" ? (
                <div className="file-thumbnail image-type" style={{ backgroundImage: `url(https://203.194.115.16.nip.io${file.file_url})` }} />
              ) : (
                /* Preview Dokumen */
                <div className="file-thumbnail doc-type">
                  <span style={{ fontSize: "3rem" }}>📄</span>
                </div>
              )}

              <div className="file-info">
                <div className="file-name">
                  {/* Tampilkan Nama File Asli (dari database) */}
                  {file.content || "File Tanpa Nama"}
                </div>
                <div className="file-meta">
                  <span>{file.username}</span>
                  <span>{format(new Date(file.created_at), "dd/MM/yy")}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FileList;
