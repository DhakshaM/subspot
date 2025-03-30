import React, { useState, useEffect } from 'react';
import './Market.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import ChatIcon from './ChatIcon';
import axios from 'axios';

function Friends() {
  const [activeTab, setActiveTab] = useState('suggested');
  const [searchTerm, setSearchTerm] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState({ username: '', email: '' });
  const API_BASE_URL = 'http://localhost:8000/subspot/';
  
  // Fetch logged-in user info
  useEffect(() => {
    fetch(`${API_BASE_URL}auth/user/`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          navigate('/');
          return Promise.reject('Not authenticated');
        }
        return res.json();
      })
      .then(data => setUserInfo({ username: data.username, email: data.email }))
      .catch(err => console.error('Error fetching user info:', err));
  }, [navigate]);

  const handleLogout = () => {
    fetch(`${API_BASE_URL}auth/logout/`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(() => {
        setIsDropdownOpen(false);
        navigate('/');
      })
      .catch(err => console.error('Logout error:', err));
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  // Sample data for demo purposes:
  const [suggestedFriends, setSuggestedFriends] = useState([
    { id: 1, username: 'John Doe', mutual_friends_count: 2 },
    { id: 2, username: 'Alice Johnson', mutual_friends_count: 4 },
    { id: 3, username: 'Mark Williams', mutual_friends_count: 1 },
  ]);

  const [myFriends, setMyFriends] = useState([
    { id: 101, username: 'Bob Smith', mutual_friends_count: 1 },
  ]);

  // Handle tab change
  const handleTabChange = (tab) => setActiveTab(tab);

  // Show popup message
  const showPopupMessage = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000);
  };

  // Simulate sending connection request
  const handleConnect = async (id) => {
    try {
      // Simulate API call (or use axios.post if needed)
      showPopupMessage('Connection request sent');
      // Optionally, you might remove the connected friend from suggested list if needed:
      // setSuggestedFriends(prev => prev.filter(friend => friend.id !== id));
    } catch (error) {
      console.error('Error connecting friend:', error);
    }
  };

  // Remove friend from My Friends list
  const handleRemove = async (id) => {
    try {
      // Simulate API call (or use axios.delete if needed)
      setMyFriends(prev => prev.filter(friend => friend.id !== id));
      showPopupMessage('Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  // Determine which list to display based on activeTab
  const displayedList = activeTab === 'suggested' ? suggestedFriends : myFriends;

  // Filter by search term
  const filteredList = displayedList.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="market-container friends-container">
      {/* Header / Navbar */}
      <header className="market-header">
        <nav className="market-nav">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/market" className="nav-link">Market</Link>
          <Link to="/friends" className="nav-link active">Friends</Link>
          <div className="user-icon">
            <FontAwesomeIcon icon={faCircleUser} onClick={toggleDropdown} />
            {isDropdownOpen && (
              <div className="user-dropdown">
                <p>Username: <span className="value">{userInfo.username}</span></p>
                <p>Email: <span className="value">{userInfo.email}</span></p>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
          <div style={{ marginLeft: '20px' }}>
            <ChatIcon />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="market-content">
        {/* Toggle Buttons */}
        <div className="subscription-toggle" style={{ marginBottom: '20px' }}>
          <button
            className={`toggle-button ${activeTab === 'suggested' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggested')}
          >
            Suggested Friends
          </button>
          <button
            className={`toggle-button ${activeTab === 'myFriends' ? 'active' : ''}`}
            onClick={() => setActiveTab('myFriends')}
          >
            My Friends
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-bar">
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder="Search Friends"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Friends List */}
        {activeTab === 'suggested' && (
          <div className="friends-list">
            {filteredList.length > 0 ? (
              filteredList.map(friend => (
                <div className="subscription-item" key={friend.id}>
                  <div className="subscription-left">
                    <div className="subscription-text">
                      <div className="subscription-name">{friend.username}</div>
                      <div className="subscription-duration">
                        {friend.mutual_friends_count} mutual friends
                      </div>
                    </div>
                  </div>
                  <div className="subscription-right">
                    <button
                      className="action-button"
                      onClick={() => handleConnect(friend.id)}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results-message">No search match found</p>
            )}
          </div>
        )}

        {activeTab === 'myFriends' && (
          <div className="friends-list">
            {filteredList.length > 0 ? (
              filteredList.map(friend => (
                <Link 
                  to={`/chat/${friend.id}`} 
                  key={friend.id}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="subscription-item">
                    <div className="subscription-left">
                      <div className="subscription-text">
                        <div className="subscription-name">{friend.username}</div>
                        <div className="subscription-duration">
                          {friend.mutual_friends_count} mutual friends
                        </div>
                      </div>
                    </div>
                    <div className="subscription-right">
                      <button
                        className="action-button"
                        onClick={(e) => { 
                          e.preventDefault();
                          handleRemove(friend.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="no-results-message">You have no friends</p>
            )}
          </div>
        )}

        {/* Popup Notification */}
        {showPopup && <div className="popup-message">{popupMessage}</div>}
      </main>
    </div>
  );
}

export default Friends;
