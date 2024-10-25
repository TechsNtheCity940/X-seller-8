import { useState, useEffect, useRef } from 'react';

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Load chat history from the backend API or local storage
  useEffect(() => {
    async function loadChatHistory() {
      try {
        // Uncomment the next lines to use backend loading
        const response = await fetch('http://localhost:5000/load-chat');
        //  const savedMessages = await response.json();
          const savedMessages = JSON.parse(localStorage.getItem('chatHistory')) || [];
        setMessages(savedMessages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }

    loadChatHistory();
  }, []);

  // Save chat history to local storage or the backend
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Uncomment to save chat history to the backend
     async function saveChatHistory() {
       try {
         await fetch('http://localhost:5000/save-chat', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ messages }),
         });
       } catch (error) {
         console.error('Failed to save chat history:', error);
       }
     }
     saveChatHistory();

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
          onKeyUp={handleKeyPress}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatBox;
