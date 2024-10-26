import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Load chat history from local storage or the backend
  useEffect(() => {
    const savedMessages = JSON.parse(localStorage.getItem('chatHistory')) || [];
    setMessages(savedMessages);
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newUserMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/api/chat', { message: input });
      const botMessage = response.data.content;
      setMessages((prev) => [...prev, { role: 'assistant', content: botMessage }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to communicate with AI. Please try again later.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">AI Chat</div>
      <div className="chatbox-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.role}`}>
            <strong>{msg.role === 'user' ? 'You' : 'Bot'}:</strong> <p>{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chatbox-input">
        <textarea
          rows="1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default Chatbot;
