import React, { useState } from 'react';

export const MessagesPanel: React.FC = () => {
  const [messages] = useState([
    { id: 1, type: 'info', text: 'System initialized successfully.', time: new Date().toLocaleTimeString() },
    { id: 2, type: 'info', text: 'Ready for engineering.', time: new Date().toLocaleTimeString() }
  ]);

  return (
    <div className="messages-panel">
      <div className="messages-header">Messages</div>
      <div className="messages-content">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.type}`}>
            <span className="msg-time">[{msg.time}]</span>
            <span className="msg-type">{msg.type.toUpperCase()}:</span>
            <span className="msg-text">{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
