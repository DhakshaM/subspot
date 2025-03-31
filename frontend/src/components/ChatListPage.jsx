import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faEllipsisV,
  faEllipsisH,
  faDownload,
  faPaperclip,
  faPaperPlane,
  faFilePdf,
  faBan,
} from '@fortawesome/free-solid-svg-icons';
import './ChatListPage.css';

// Update the API base URL to match the Dashboard.js pattern
const API_BASE_URL = 'http://localhost:8000/subspot/';

// Add this function to parse the URL parameters
const getURLParams = () => {
  const queryParams = new URLSearchParams(window.location.search);
  return {
    userId: queryParams.get('user_id'),
  };
};

const ChatListPage = () => {
  const navigate = useNavigate();
  // Chat state
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [typedMessage, setTypedMessage] = useState('');
  const [replyMsg, setReplyMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const fileInputRef = useRef(null);

  // Modals / popups
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState({ open: false, src: '', fileName: '' });
  const [deletePopup, setDeletePopup] = useState({ open: false, msgIndex: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMsgOptions, setOpenMsgOptions] = useState(null);
  const menuRef = useRef(null);
  const msgOptionsRef = useRef(null);

  const getTimeStamp = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Fetch user info like in Dashboard.js
  useEffect(() => {
    fetch(`${API_BASE_URL}auth/user/`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          navigate('/');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUserInfo(data);
        }
      })
      .catch((err) => console.error('Error fetching user info:', err));
  }, [navigate]);

  // Update component initialization to check for URL parameters only once
  useEffect(() => {
    const { userId } = getURLParams();
    
    // Only handle the URL param once when the component mounts
    if (userId && chatList.length > 0) {
      setIsLoading(true);
      startNewChat(userId);
    }
  }, [chatList.length]); // Only re-run when chatList changes

  // Fetch chat list when component mounts - matches ChatListView in chat_views.py
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}chats/`, {
          credentials: 'include',
        });

        if (response.status === 401) {
          navigate('/');
          return;
        }

        const data = await response.json();

        // Transform the data to match the response from ChatListView
        const fetchedChats = data.map((chat) => ({
          id: chat.id.toString(),
          name: chat.other_participant.username || `Chat #${chat.id}`,
          lastMessage: chat.last_message?.text || '',
          unreadCount: chat.unread_count || 0,
        }));

        setChatList(fetchedChats);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [navigate]);

  // Fix the fetchMessages function to properly convert types when comparing IDs
  useEffect(() => {
    if (!selectedChat) return;

    const fetchMessages = async () => {
      try {
        // Create URLSearchParams for POST request to match ChatDetailView
        const formData = new URLSearchParams();
        formData.append('chat_id', selectedChat);

        const response = await fetch(`${API_BASE_URL}chats/detail/`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });

        if (response.status === 401) {
          navigate('/');
          return;
        }

        const data = await response.json();

        // Transform messages to match our component's structure
        const transformedMessages = data.messages.map((msg) => {
          // Use string comparison or convert both to numbers
          const isMine = Number(msg.sender_id) === Number(userInfo?.id);

          const messageObj = {
            id: msg.id,
            user: isMine ? 'Me' : msg.sender_name,
            message: msg.text,
            time: new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            is_read: msg.is_read,
            sender_id: msg.sender_id
          };

          return messageObj;
        });

        setMessages((prev) => ({
          ...prev,
          [selectedChat]: transformedMessages,
        }));

        // Mark messages as read when chat is selected
        markMessagesAsRead(selectedChat);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedChat, navigate, userInfo]);

  // Mark messages as read using MarkMessagesReadView
  const markMessagesAsRead = async (chatId) => {
    try {
      const formData = new URLSearchParams();
      formData.append('chat_id', chatId);

      await fetch(`${API_BASE_URL}messages/mark-read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      // Update the unreadCount in the chat list
      setChatList((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Send a message using MessageCreateView in chat_views.py
  const handleSend = async () => {
    if (!typedMessage.trim() || !selectedChat) return;

    // Create new message object for UI
    const newMessage = {
      user: 'Me',
      message: typedMessage,
      time: getTimeStamp(),
    };

    if (replyMsg) {
      newMessage.replyTo = {
        user: replyMsg.user || 'Them',
        message: replyMsg.message,
      };
    }

    // Optimistically update UI
    setMessages((prev) => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), newMessage],
    }));

    try {
      // Create form data for POST request to match MessageCreateView
      const formData = new URLSearchParams();
      formData.append('chat_id', selectedChat);
      formData.append('text', typedMessage);
      
      // Add reply_to_id if user is replying to a message
      if (replyMsg?.id) {
        formData.append('reply_to_id', replyMsg.id);
      }

      // Send to REST API using MessageCreateView
      const response = await fetch(`${API_BASE_URL}messages/create/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error sending message:', errorData.error);
        return;
      }

      const data = await response.json();
      
      // We could update the message with the returned data if needed
      // For example, updating the message ID for future operations
      setMessages((prev) => {
        const currentMessages = [...prev[selectedChat]];
        const lastIndex = currentMessages.length - 1;
        
        // Update last message with ID from server and other details
        currentMessages[lastIndex] = {
          ...currentMessages[lastIndex],
          id: data.id,
        };
        
        return {
          ...prev,
          [selectedChat]: currentMessages,
        };
      });

    } catch (error) {
      console.error('Error sending message:', error);
    }

    // Reset input
    setTypedMessage('');
    setReplyMsg(null);
  };

  // File upload - since there's no direct file upload endpoint,
  // this is a placeholder for integration with your file upload system
  const handleUploadClick = () => {
    if (!selectedChat) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    const fileName = file.name;
    const fileType = file.type.toLowerCase();
    const timeStamp = getTimeStamp();

    // Determine message type
    let messageType = 'file';
    if (fileType.startsWith('image/')) {
      messageType = 'image';
    } else if (
      fileType === 'application/pdf' ||
      fileName.toLowerCase().endsWith('.pdf')
    ) {
      messageType = 'pdf';
    }

    // Create message for optimistic UI update
    const reader = new FileReader();
    reader.onload = async () => {
      let newMsg = { user: 'Me', time: timeStamp };
      if (messageType === 'image') {
        newMsg.type = 'image';
        newMsg.src = reader.result;
      } else if (messageType === 'pdf') {
        newMsg.type = 'pdf';
        newMsg.src = reader.result;
        newMsg.fileName = fileName;
      } else {
        newMsg.type = 'file';
        newMsg.src = reader.result;
        newMsg.fileName = fileName;
      }

      // Update UI optimistically
      setMessages((prev) => ({
        ...prev,
        [selectedChat]: [...(prev[selectedChat] || []), newMsg],
      }));

      // Since there's no direct file upload endpoint in chat_views.py,
      // this is a placeholder for integration with your file upload system
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Update startNewChat to prevent duplicate chat creation
  const startNewChat = async (userId, initialMessage = null) => {
    // First check if we already have a chat with this user
    const existingChat = chatList.find(chat => {
      return chat.name === userInfo?.username;
    });
    
    if (existingChat) {
      // Just select the existing chat instead of creating a new one
      setSelectedChat(existingChat.id);
      setIsLoading(false);
      return;
    }

    try {
      // Create URLSearchParams for POST request to match StartChatView
      const formData = new URLSearchParams();
      formData.append('user_id', userId);
      
      const response = await fetch(`${API_BASE_URL}chats/start/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (response.status === 401) {
        navigate('/');
        return;
      }

      const data = await response.json();
      
      // Add to chat list if not already there
      setChatList(prev => {
        // Check if this chat already exists in our list
        if (!prev.some(chat => chat.id === data.id.toString())) {
          return [
            ...prev,
            {
              id: data.id.toString(),
              name: data.other_participant.username || `Chat #${data.id}`,
              lastMessage: data.last_message?.text || '',
              unreadCount: data.unread_count || 0,
            }
          ];
        }
        return prev;
      });
      
      // Select this chat
      setSelectedChat(data.id.toString());
      
      // If there's an initial message, send it
      if (initialMessage) {
        setTypedMessage(initialMessage);
        // Use setTimeout to ensure the chat is selected before sending
        setTimeout(() => handleSend(), 300);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting new chat:', error);
      setIsLoading(false);
    }
  };

  // Delete message - since there's no API endpoint for deleting messages in chat_views.py,
  // this is a placeholder for future integration
  const handleDeleteMessage = async (
    chatId,
    msgIndex,
    deleteForAll = false
  ) => {
    const message = messages[chatId][msgIndex];

    // Optimistically update UI
    setMessages((prev) => {
      const updated = [...(prev[chatId] || [])];
      if (!deleteForAll) {
        updated.splice(msgIndex, 1);
      } else {
        const originalMsg = updated[msgIndex];
        updated[msgIndex] = {
          ...originalMsg,
          type: 'deleted',
          message: 'You deleted this message',
          replyTo: undefined,
          src: undefined,
          fileName: undefined,
        };
      }
      return { ...prev, [chatId]: updated };
    });

    // Since there's no delete message endpoint in chat_views.py,
    // this is a placeholder for future integration

    setDeletePopup({ open: false, msgIndex: null });
    setOpenMsgOptions(null);
  };

  // UI helper functions
  const openImageModal = (src) => setModalImage(src);
  const closeImageModal = () => setModalImage(null);
  const openPdfModal = (src, fileName) =>
    setPdfModal({ open: true, src, fileName });
  const closePdfModal = () =>
    setPdfModal({ open: false, src: '', fileName: '' });
  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleMsgOptions = (index) =>
    setOpenMsgOptions((prev) => (prev === index ? null : index));
  const openDeletePopup = (index) =>
    setDeletePopup({ open: true, msgIndex: index });
  const handleDeletePopupClose = () =>
    setDeletePopup({ open: false, msgIndex: null });

  const handleReplyMessage = (msg) => {
    setReplyMsg(msg);
    setOpenMsgOptions(null);
  };

  // Close dropdowns if clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (msgOptionsRef.current && !msgOptionsRef.current.contains(e.target)) {
        setOpenMsgOptions(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The rest of your component's JSX remains the same
  return (
    <div className="chats-container">
      <div className="chats-wrapper">
        {/* Left Panel */}
        <div className="chats-left-panel">
          <header className="chats-left-header">
            <Link to="/dashboard" className="back-link arrow-only">
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <h2 className="chats-title">Chat</h2>
          </header>

          <ul className="chat-list" style={{ textAlign: 'center' }}>
            {isLoading ? (
              <li className="chat-item">Loading chats...</li>
            ) : chatList.length === 0 ? (
              <li className="chat-item">No chats found</li>
            ) : (
              chatList.map((chat) => (
                <li
                  key={chat.id}
                  className={`chat-item ${
                    selectedChat === chat.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <span className="chat-link">{chat.name}</span>
                  {chat.unreadCount > 0 && (
                    <span className="unread-count">{chat.unreadCount}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Right Panel */}
        <div
          className={
            selectedChat ? 'chats-right-panel doodle' : 'chats-right-panel'
          }
        >
          {selectedChat ? (
            <div className="chat-content">
              <header className="chats-right-header">
                <span className="chat-contact-name">
                  {chatList.find((chat) => chat.id === selectedChat)?.name}
                </span>
                <div className="chat-header-actions" ref={menuRef}>
                  <FontAwesomeIcon
                    icon={faEllipsisV}
                    className="ellipsis-icon"
                    onClick={toggleMenu}
                  />
                  {menuOpen && (
                    <div className="chat-menu-dropdown">
                      <div
                        className="dropdown-item"
                        onClick={() => {
                          setMessages((prev) => ({
                            ...prev,
                            [selectedChat]: [],
                          }));
                          setMenuOpen(false);
                        }}
                      >
                        Clear Chat
                      </div>
                      <div
                        className="dropdown-item"
                        onClick={() => {
                          // Remove chat from chatList and messages
                          setChatList((prev) =>
                            prev.filter((c) => c.id !== selectedChat)
                          );
                          setMessages((prev) => {
                            const newMsgs = { ...prev };
                            delete newMsgs[selectedChat];
                            return newMsgs;
                          });
                          setSelectedChat(null);
                          setMenuOpen(false);
                        }}
                      >
                        Delete Chat
                      </div>
                    </div>
                  )}
                </div>
              </header>

              <div className="chat-messages" ref={msgOptionsRef}>
                {(messages[selectedChat] || []).map((msg, index) => {
                  const isMine = msg.user === 'Me';
                  return (
                    <div
                      key={index}
                      className={`message-wrapper ${
                        isMine ? 'mine' : 'theirs'
                      }`}
                    >
                      {isMine && (
                        <div
                          className="msg-options-container"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FontAwesomeIcon
                            icon={faEllipsisH}
                            className="msg-options-icon"
                            onClick={() => toggleMsgOptions(index)}
                          />
                          {openMsgOptions === index && (
                            <div
                              className="msg-options-dropdown"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                className="msg-option-item"
                                onClick={() => handleReplyMessage(msg)}
                              >
                                Reply
                              </div>
                              <div
                                className="msg-option-item"
                                onClick={() => openDeletePopup(index)}
                              >
                                Delete
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`message-bubble ${
                          isMine ? 'mine' : 'theirs'
                        }`}
                      >
                        {msg.replyTo && (
                          <div className="mini-reply-bubble">
                            <span className="mini-reply-sender">
                              {msg.replyTo.user}
                            </span>
                            <span className="mini-reply-text">
                              {msg.replyTo.message}
                            </span>
                          </div>
                        )}

                        {msg.type === 'deleted' ? (
                          <>
                            <div className="message-text deleted">
                              <FontAwesomeIcon
                                icon={faBan}
                                className="deleted-icon"
                              />
                              {msg.message}
                            </div>
                            <div className="message-time">{msg.time}</div>
                          </>
                        ) : msg.type === 'image' ? (
                          <>
                            <img
                              src={msg.src}
                              alt="sent"
                              className="message-image"
                              onClick={() => openImageModal(msg.src)}
                            />
                            <div className="message-time">{msg.time}</div>
                          </>
                        ) : msg.type === 'pdf' ? (
                          <>
                            <div
                              className="pdf-preview"
                              onClick={() =>
                                openPdfModal(msg.src, msg.fileName)
                              }
                            >
                              <FontAwesomeIcon
                                icon={faFilePdf}
                                className="pdf-icon"
                              />
                              <span className="pdf-filename">
                                {msg.fileName}
                              </span>
                            </div>
                            <div className="message-time">{msg.time}</div>
                          </>
                        ) : msg.type === 'file' ? (
                          <>
                            <a
                              href={msg.src}
                              download={msg.fileName}
                              className="file-link"
                              title="Download File"
                            >
                              {msg.fileName}
                            </a>
                            <div className="message-time">{msg.time}</div>
                          </>
                        ) : (
                          <>
                            <div className="message-text">{msg.message}</div>
                            <div className="message-time">{msg.time}</div>
                          </>
                        )}
                      </div>

                      {!isMine && (
                        <div
                          className="msg-options-container"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FontAwesomeIcon
                            icon={faEllipsisH}
                            className="msg-options-icon"
                            onClick={() => toggleMsgOptions(index)}
                          />
                          {openMsgOptions === index && (
                            <div
                              className="msg-options-dropdown"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                className="msg-option-item"
                                onClick={() => handleReplyMessage(msg)}
                              >
                                Reply
                              </div>
                              <div
                                className="msg-option-item"
                                onClick={() => openDeletePopup(index)}
                              >
                                Delete
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {replyMsg && (
                <div className="reply-bubble">
                  <span className="reply-text">{replyMsg.message}</span>
                  <span
                    className="cancel-reply"
                    onClick={() => setReplyMsg(null)}
                  >
                    &times;
                  </span>
                </div>
              )}

              <div className="chats-input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                />
                <FontAwesomeIcon
                  icon={faPaperPlane}
                  className="send-icon"
                  onClick={handleSend}
                />
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <FontAwesomeIcon
                  icon={faPaperclip}
                  className="upload-icon"
                  onClick={handleUploadClick}
                />
              </div>
            </div>
          ) : (
            <div className="chat-placeholder">Start Messaging</div>
          )}
        </div>
      </div>

      {deletePopup.open && (
        <div
          className="delete-popup-modal"
          onClick={handleDeletePopupClose}
        >
          <div
            className="delete-popup-content"
            onClick={(e) => e.stopPropagation()}
          >
            <p>Delete message:</p>
            <div className="delete-popup-options">
              <span
                className="delete-option"
                onClick={() =>
                  handleDeleteMessage(
                    selectedChat,
                    deletePopup.msgIndex,
                    false
                  )
                }
              >
                Delete for me
              </span>
              <span
                className="delete-option"
                onClick={() =>
                  handleDeleteMessage(
                    selectedChat,
                    deletePopup.msgIndex,
                    true
                  )
                }
              >
                Delete for all
              </span>
            </div>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="close-modal-icon"
              onClick={closeImageModal}
            >
              &times;
            </span>
            <img
              src={modalImage}
              alt="Enlarged"
              className="modal-image"
            />
            <a
              href={modalImage}
              download="image.png"
              className="download-link"
            >
              <FontAwesomeIcon icon={faDownload} />
            </a>
          </div>
        </div>
      )}

      {pdfModal.open && (
        <div className="pdf-modal" onClick={closePdfModal}>
          <div
            className="pdf-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="close-pdf-modal"
              onClick={closePdfModal}
            >
              &times;
            </span>
            <embed
              src={pdfModal.src}
              type="application/pdf"
              className="pdf-embed"
            />
            <a
              href={pdfModal.src}
              download={pdfModal.fileName}
              className="download-pdf-icon"
              title="Download PDF"
            >
              <FontAwesomeIcon icon={faDownload} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatListPage;
