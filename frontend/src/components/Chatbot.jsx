import React, { useState } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);

  const handleSend = async () => {
    if (!userMessage) return;

    const newLog = [...chatLog, { role: 'user', content: userMessage }];
    setChatLog(newLog);
    setUserMessage('');

    try {
      const response = await axios.post('http://localhost:5000/chat', {
        message: userMessage,
      });

      const botMessage = response.data.content;
      setChatLog([...newLog, { role: 'assistant', content: botMessage }]);
    } catch (error) {
      console.error('Error sending message:', error);
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