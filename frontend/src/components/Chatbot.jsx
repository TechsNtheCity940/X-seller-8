// Chatbot.jsx
import React, { useState } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [error, setError] = useState(null); // Add error state

  const handleSend = async () => {
    if (!userMessage.trim()) return;

    const newLog = [...chatLog, { role: 'user', content: userMessage }];
    setChatLog(newLog);
    setUserMessage('');
    setError(null); // Reset error state

    try {
      const response = await axios.post('http://localhost:5000/chat', { message: userMessage });
      const botMessage = response.data.content;
      setChatLog([...newLog, { role: 'assistant', content: botMessage }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to communicate with AI. Please try again later.');
    }
  };

  return (
    <div className="chatbox">
      <h2>AI Chatbox</h2>
      <div className="chat-log">
        {chatLog.map((entry, index) => (
          <div key={index} className={entry.role === 'user' ? 'user-message' : 'bot-message'}>
            <strong>{entry.role === 'user' ? 'You' : 'Bot'}:</strong> {entry.content}
          </div>
        ))}
        {error && <div className="error-message">{error}</div>}
      </div>
      <input
        type="text"
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default Chatbot;
