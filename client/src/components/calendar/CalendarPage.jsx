// File: client/src/components/calendar/CalendarPage.jsx
// (FINAL: BLOKIR TANGGAL MASA LALU)

import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { id } from "date-fns/locale";

import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import EventModal from "./EventModal";
import "./Calendar.css";

const locales = {
  id: id,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { user } = useAuth();

  // Cek Role
  const canEdit = user && ["owner", "hrd", "admin"].includes(user.role?.toLowerCase());

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://203.194.115.16:5000/api/events", {
        headers: { "x-auth-token": token },
      });

      const formattedEvents = res.data.map((evt) => ({
        ...evt,
        start: new Date(evt.start_time),
        end: new Date(evt.end_time),
        resource: evt.importance,
      }));
      setEvents(formattedEvents);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // --- VALIDASI: CEK TANGGAL MASA LALU ---
  const handleSelectSlot = ({ start, end }) => {
    if (!canEdit) return;

    // Buat objek "Hari Ini" (jam 00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jika tanggal yang dipilih lebih kecil dari hari ini
    if (start < today) {
      alert("Tidak bisa membuat acara di tanggal yang sudah lewat.");
      return;
    }

    setSelectedEvent({ start, end });
    setIsModalOpen(true);
  };
  // ---------------------------------------

  const handleSelectEvent = (event) => {
    if (!canEdit) {
      const startStr = format(event.start, "EEEE, d MMM yyyy, HH:mm", { locale: id });
      const endStr = format(event.end, "HH:mm", { locale: id });

      alert(`📅 ${event.title}\n📝 ${event.description || "-"}\n⏰ ${startStr} - ${endStr}`);
      return;
    }
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const eventStyleGetter = (event) => {
    const backgroundColor = event.importance === "high" ? "#d93025" : "#00796b";
    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        margin: "1px 2px",
        padding: "2px 5px",
        fontSize: "0.85rem",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      },
    };
  };

  // --- VISUAL: WARNAI TANGGAL LEWAT ---
  const dayPropGetter = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jika tanggal < hari ini, beri background abu-abu
    if (date < today) {
      return {
        style: {
          backgroundColor: "#f5f5f5",
          cursor: "not-allowed",
          color: "#ccc",
        },
      };
    }
    return {};
  };
  // ------------------------------------

  const handleDelete = async (id) => {
    if (!window.confirm("Hapus acara ini?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://203.194.115.16:5000/api/events/${id}`, { headers: { "x-auth-token": token } });
      fetchEvents();
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header-custom">
        <h2>Kalender Acara</h2>
        {canEdit && (
          <button
            className="create-channel-btn"
            style={{ width: "auto" }}
            onClick={() => {
              // Default ke hari ini jika klik tombol tambah manual
              const now = new Date();
              setSelectedEvent({ start: now, end: now });
              setIsModalOpen(true);
            }}
          >
            + Tambah Acara
          </button>
        )}
      </div>

      <div style={{ height: "80vh", padding: "20px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="id"
          selectable={canEdit}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter} // <-- Tambahkan properti ini
          popup={true}
          messages={{
            next: "Maju",
            previous: "Mundur",
            today: "Hari Ini",
            month: "Bulan",
            week: "Minggu",
            day: "Hari",
            agenda: "Agenda",
            date: "Tanggal",
            time: "Waktu",
            event: "Acara",
            noEventsInRange: "Tidak ada acara di rentang ini.",
          }}
        />
      </div>

      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedEvent={selectedEvent} onEventSaved={fetchEvents} onDelete={handleDelete} />
    </div>
  );
};

export default CalendarPage;
