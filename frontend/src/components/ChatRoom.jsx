import React, { useEffect, useState } from 'react';

const ChatRoom = ({ roomName }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');

  useEffect(() => {
    if (!roomName) return; 

    // Create the WebSocket connection using the dynamic roomName
    const chatSocket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${roomName}/`);
    // const chatSocket = new WebSocket('ws://127.0.0.1:8000/ws/chat/room1/');

    chatSocket.onopen = () => {
      console.log('WebSocket connected for room:', roomName);
    };

    chatSocket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.message) {
        // console.log('Received:', data.message);
        setMessages((prev) => [...prev, data.message]);
      }
    };

    chatSocket.onerror = (error) => console.error('WebSocket error:', error);
    chatSocket.onclose = (e) => console.warn('WebSocket closed:', e);

    setSocket(chatSocket);

    return () => chatSocket.close();
  }, [roomName]);

  const sendMessage = () => {
    if (socket && typedMessage.trim()) {
      socket.send(JSON.stringify({ message: typedMessage }));
      setTypedMessage('');
    }
  };

  return (
    <div>
      <h2>Chat Room: {roomName}</h2>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.user}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={typedMessage}
        onChange={(e) => setTypedMessage(e.target.value)}
        onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatRoom;
