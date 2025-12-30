// File: client/src/components/layout/ContentArea.jsx
// (DIUPDATE UNTUK MENERUSKAN 'onGroupDeleted')

import React from "react";
import ChatWindow from "./ChatWindow";

// 1. Terima 'onGroupDeleted'
const ContentArea = ({ selectedChannelId, onClearSelection, onGroupDeleted }) => {
  return (
    <div className="content-area">
      {selectedChannelId ? (
        <ChatWindow
          channelId={selectedChannelId}
          onClearSelection={onClearSelection}
          onGroupDeleted={onGroupDeleted} // 2. Teruskan ke ChatWindow
        />
      ) : (
        <div className="chat-placeholder">
          <span role="img" aria-label="emoji" style={{ fontSize: "50px" }}>
            👈
          </span>
          <h2>Pilih obrolan dari samping untuk memulai</h2>
        </div>
      )}
    </div>
  );
};
export default ContentArea;
