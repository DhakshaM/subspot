import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const ChatListPage = () => {
  // Now we include both the value AND the setter
  const [chatList, setChatList] = useState([
    { id: 'Friend1', name: 'Friend1' },
    { id: 'Friend2', name: 'Friend2' },
    { id: 'Seller1', name: 'Seller1' },
  ]);

  const [selectedChat, setSelectedChat] = useState(null);

  // Preload some messages for Friend1
  const [messages, setMessages] = useState({
    Friend1: [
      {
        user: 'Friend1',
        message: 'Hello!',
        time: '10:00 AM',
      },
      {
        user: 'Me',
        message: 'Hi there!',
        time: '10:01 AM',
      },
    ],
  });

  const [typedMessage, setTypedMessage] = useState('');
  const [replyMsg, setReplyMsg] = useState(null);
  const fileInputRef = useRef(null);

  // Modals / popups
  const [modalImage, setModalImage] = useState(null);
  const [pdfModal, setPdfModal] = useState({ open: false, src: '', fileName: '' });
  const [deletePopup, setDeletePopup] = useState({ open: false, msgIndex: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMsgOptions, setOpenMsgOptions] = useState(null);
  const menuRef = useRef(null);
  const msgOptionsRef = useRef(null);

  // WebSocket for the current friend
  const [socket, setSocket] = useState(null);

  const getTimeStamp = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Open WebSocket whenever selectedChat changes
  useEffect(() => {
    if (!selectedChat) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${selectedChat}/`);

    ws.onopen = () => {
      console.log('WebSocket connected for room:', selectedChat);
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.message) {
        setMessages((prev) => ({
          ...prev,
          [selectedChat]: [...(prev[selectedChat] || []), data],
        }));
      }
    };

    ws.onerror = (err) => console.error('WebSocket error:', err);
    ws.onclose = (e) => console.warn('WebSocket closed:', e);

    setSocket(ws);

    return () => ws.close();
  }, [selectedChat]);

  // Send a message
  const handleSend = () => {
    if (!socket || !typedMessage.trim() || !selectedChat) return;

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

    setMessages((prev) => ({
      ...prev,
      [selectedChat]: [...(prev[selectedChat] || []), newMessage],
    }));

    socket.send(JSON.stringify({ message: typedMessage }));
    setTypedMessage('');
    setReplyMsg(null);
  };

  // File upload
  const handleUploadClick = () => {
    if (!selectedChat) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    const fileName = file.name;
    const fileType = file.type.toLowerCase();
    const timeStamp = getTimeStamp();
    const reader = new FileReader();

    reader.onload = () => {
      let newMsg = { user: 'Me', time: timeStamp };
      if (fileType.startsWith('image/')) {
        newMsg.type = 'image';
        newMsg.src = reader.result;
      } else if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        newMsg.type = 'pdf';
        newMsg.src = reader.result;
        newMsg.fileName = fileName;
      } else {
        newMsg.type = 'file';
        newMsg.src = reader.result;
        newMsg.fileName = fileName;
      }
      setMessages((prev) => ({
        ...prev,
        [selectedChat]: [...(prev[selectedChat] || []), newMsg],
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Image/PDF modals
  const openImageModal = (src) => setModalImage(src);
  const closeImageModal = () => setModalImage(null);
  const openPdfModal = (src, fileName) => setPdfModal({ open: true, src, fileName });
  const closePdfModal = () => setPdfModal({ open: false, src: '', fileName: '' });

  // Header menu
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Message options
  const toggleMsgOptions = (index) =>
    setOpenMsgOptions((prev) => (prev === index ? null : index));

  const openDeletePopup = (index) => setDeletePopup({ open: true, msgIndex: index });
  const handleDeletePopupClose = () => setDeletePopup({ open: false, msgIndex: null });

  // Delete or reply
  const handleDeleteMessage = (chatId, msgIndex, deleteForAll = false) => {
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
    setDeletePopup({ open: false, msgIndex: null });
    setOpenMsgOptions(null);
  };

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            {chatList.map((chat) => (
              <li
                key={chat.id}
                className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(chat.id)}
              >
                <span className="chat-link">{chat.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right Panel */}
        <div className={selectedChat ? 'chats-right-panel doodle' : 'chats-right-panel'}>
          {selectedChat ? (
            <div className="chat-content">
              <header className="chats-right-header">
                <span className="chat-contact-name">{selectedChat}</span>
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
                          setMessages((prev) => ({ ...prev, [selectedChat]: [] }));
                          setMenuOpen(false);
                        }}
                      >
                        Clear Chat
                      </div>
                      <div
                        className="dropdown-item"
                        onClick={() => {
                          // Remove friend from chatList and messages
                          setChatList((prev) => prev.filter((c) => c.id !== selectedChat));
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
                    <div key={index} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                      {isMine && (
                        <div className="msg-options-container" onClick={(e) => e.stopPropagation()}>
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
                              <div className="msg-option-item" onClick={() => handleReplyMessage(msg)}>
                                Reply
                              </div>
                              <div className="msg-option-item" onClick={() => openDeletePopup(index)}>
                                Delete
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                        {msg.replyTo && (
                          <div className="mini-reply-bubble">
                            <span className="mini-reply-sender">{msg.replyTo.user}</span>
                            <span className="mini-reply-text">{msg.replyTo.message}</span>
                          </div>
                        )}

                        {msg.type === 'deleted' ? (
                          <>
                            <div className="message-text deleted">
                              <FontAwesomeIcon icon={faBan} className="deleted-icon" />
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
                              onClick={() => openPdfModal(msg.src, msg.fileName)}
                            >
                              <FontAwesomeIcon icon={faFilePdf} className="pdf-icon" />
                              <span className="pdf-filename">{msg.fileName}</span>
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
                        <div className="msg-options-container" onClick={(e) => e.stopPropagation()}>
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
                              <div className="msg-option-item" onClick={() => handleReplyMessage(msg)}>
                                Reply
                              </div>
                              <div className="msg-option-item" onClick={() => openDeletePopup(index)}>
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
                  <span className="cancel-reply" onClick={() => setReplyMsg(null)}>
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
                <FontAwesomeIcon icon={faPaperPlane} className="send-icon" onClick={handleSend} />
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <FontAwesomeIcon icon={faPaperclip} className="upload-icon" onClick={handleUploadClick} />
              </div>
            </div>
          ) : (
            <div className="chat-placeholder">Start Messaging</div>
          )}
        </div>
      </div>

      {deletePopup.open && (
        <div className="delete-popup-modal" onClick={handleDeletePopupClose}>
          <div className="delete-popup-content" onClick={(e) => e.stopPropagation()}>
            <p>Delete message:</p>
            <div className="delete-popup-options">
              <span
                className="delete-option"
                onClick={() => handleDeleteMessage(selectedChat, deletePopup.msgIndex, false)}
              >
                Delete for me
              </span>
              <span
                className="delete-option"
                onClick={() => handleDeleteMessage(selectedChat, deletePopup.msgIndex, true)}
              >
                Delete for all
              </span>
            </div>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-modal-icon" onClick={closeImageModal}>
              &times;
            </span>
            <img src={modalImage} alt="Enlarged" className="modal-image" />
            <a href={modalImage} download="image.png" className="download-link">
              <FontAwesomeIcon icon={faDownload} />
            </a>
          </div>
        </div>
      )}

      {pdfModal.open && (
        <div className="pdf-modal" onClick={closePdfModal}>
          <div className="pdf-modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-pdf-modal" onClick={closePdfModal}>
              &times;
            </span>
            <embed src={pdfModal.src} type="application/pdf" className="pdf-embed" />
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
