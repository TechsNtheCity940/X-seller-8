import React, { useState, useEffect, useRef } from 'react';
const express = require('express');
const app = express();

let chatHistory = [];

app.use(express.json());

app.post('/save-chat', (req, res) => {
  chatHistory = req.body.messages;
  res.status(200).send('Chat saved');
});

app.get('/load-chat', (req, res) => {
  res.json(chatHistory);
});
const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Load chat history from local storage on component mount
  useEffect(() => {
    const savedMessages = JSON.parse(localStorage.getItem('chatHistory')) || [];
    setMessages(savedMessages);
  }, []);

  // Save chat history to local storage on messages change
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
    // Scroll to the bottom of the messages list
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input, sender: 'User' }]);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chatbox-container">
      <div className="chatbox-header">Chat</div>
      <div className="chatbox-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chatbox-input">
        <textarea
          rows="1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatBox;