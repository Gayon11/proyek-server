// File: client/src/components/calendar/EventModal.jsx

import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";
import "./Calendar.css"; // Kita buat nanti

const EventModal = ({ isOpen, onClose, selectedEvent, onEventSaved, onDelete }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [importance, setImportance] = useState("normal");

  useEffect(() => {
    if (selectedEvent) {
      // Mode Edit: Isi form dengan data event
      setTitle(selectedEvent.title);
      setDescription(selectedEvent.description || "");
      setImportance(selectedEvent.importance || "normal");

      // Format tanggal untuk input datetime-local (YYYY-MM-DDTHH:MM)
      const formatDateTime = (date) => new Date(date).toISOString().slice(0, 16);
      setStartTime(selectedEvent.start ? formatDateTime(selectedEvent.start) : "");
      setEndTime(selectedEvent.end ? formatDateTime(selectedEvent.end) : "");
    } else {
      // Mode Buat Baru: Reset
      setTitle("");
      setDescription("");
      setImportance("normal");
      setStartTime("");
      setEndTime("");
    }
  }, [selectedEvent, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const eventData = {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      importance,
    };

    try {
      if (selectedEvent && selectedEvent.event_id) {
        // UPDATE
        await axios.put(`https://203.194.115.16.nip.io/api/events/${selectedEvent.event_id}`, eventData, {
          headers: { "x-auth-token": token },
        });
      } else {
        // CREATE
        await axios.post(`https://203.194.115.16.nip.io/api/events`, eventData, {
          headers: { "x-auth-token": token },
        });
      }
      onEventSaved();
      onClose();
    } catch (err) {
      alert("Gagal menyimpan event");
      console.error(err);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} className="modal-content" overlayClassName="modal-overlay">
      <div className="modal-header">
        <h2>{selectedEvent?.event_id ? "Edit Acara" : "Buat Acara Baru"}</h2>
        <button onClick={onClose} className="modal-close-btn">
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Judul Acara</label>
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Catatan/Deskripsi</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Mulai</label>
          <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Selesai</label>
          <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Tingkat Penting</label>
          <select value={importance} onChange={(e) => setImportance(e.target.value)}>
            <option value="normal">Hijau (Biasa)</option>
            <option value="high">Merah (Sangat Penting)</option>
          </select>
        </div>

        <div className="form-actions">
          {selectedEvent?.event_id && (
            <button type="button" className="btn-danger" onClick={() => onDelete(selectedEvent.event_id)} style={{ marginRight: "auto" }}>
              Hapus
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-cancel">
            Batal
          </button>
          <button type="submit" className="btn-submit">
            Simpan
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EventModal;
