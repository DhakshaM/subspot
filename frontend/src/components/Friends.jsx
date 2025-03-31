import React, { useState, useEffect } from 'react';
import './Market.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faSearch, faClock } from '@fortawesome/free-solid-svg-icons';
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
  const [friendsSubscriptions, setFriendsSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingSentIds, setPendingSentIds] = useState([]);
  const API_BASE_URL = 'http://localhost:8000/subspot/';
  
  // Fetch logged-in user info and connections data
  useEffect(() => {
    fetch(`${API_BASE_URL}auth/user/`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          navigate('/');
          return Promise.reject('Not authenticated');
        }
        return res.json();
      })
      .then(data => {
        setUserInfo({ username: data.username, email: data.email });
        // After getting user info, fetch connections data
        fetchUserConnections();
      })
      .catch(err => console.error('Error fetching user info:', err));
      
    // Load subscriptions when the component mounts or when tab changes to subscriptions
    if (activeTab === 'subscriptions') {
      fetchFriendsSubscriptions();
    }
  }, [navigate, activeTab]);
  
  // Fetch friends' subscriptions when switching to the subscriptions tab
  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchFriendsSubscriptions();
    }
  }, [activeTab]);

  const fetchFriendsSubscriptions = () => {
    setIsLoading(true);
    fetch(`${API_BASE_URL}friends/subscriptions/`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setFriendsSubscriptions(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching friends\' subscriptions:', err);
        setIsLoading(false);
      });
  };

  const fetchSuggestedFriends = () => {
    fetch(`${API_BASE_URL}connection/suggested/`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setSuggestedFriends(data);
        
        // Extract IDs of users where we've sent pending requests
        const sentIds = data
          .filter(user => user.connection_status === 'sent_pending')
          .map(user => user.id);
          
        setPendingSentIds(sentIds);
      })
      .catch(err => {
        console.error('Error fetching suggested friends:', err);
      });
  };

  const fetchUserConnections = () => {
    // Load connections data (friends, pending requests)
    fetch(`${API_BASE_URL}connections/`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setPendingRequests(data.pending_received || []);
        // Update myFriends with actual friends data
        setMyFriends(data.friends || []);
        
        // Get IDs of users we've sent requests to
        const sentIds = (data.pending_sent || []).map(user => user.id);
        setPendingSentIds(sentIds);
      })
      .catch(err => {
        console.error('Error fetching user connections:', err);
      });

    // Also fetch suggested friends to get their updated status
    fetchSuggestedFriends();
  };

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

  // Send connection request
  const handleConnect = async (id) => {
    try {
      // Convert to URLSearchParams for consistent format with other requests
      const params = new URLSearchParams();
      params.append('user_id', id);
      
      const response = await fetch(`${API_BASE_URL}connection/request/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showPopupMessage('Connection request sent');
        // Instead of removing, add to pending sent list
        setPendingSentIds(prev => [...prev, id]);
      } else {
        showPopupMessage(data.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error connecting friend:', error);
      showPopupMessage('Error connecting friend');
    }
  };

  // Handle friend request (accept or reject)
  const handleFriendRequest = async (userId, action) => {
    try {
      const params = new URLSearchParams();
      params.append('user_id', userId); // Using userId parameter correctly
      params.append('action', action);
      
      const response = await fetch(`${API_BASE_URL}connection/handle/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.id !== userId));
        showPopupMessage(action === 'accept' ? 'Friend request accepted' : 'Friend request declined');
        
        // If accepted, refresh connections to update friends list
        if (action === 'accept') {
          fetchUserConnections();
        }
      } else {
        showPopupMessage(data.error || `Failed to ${action} request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      showPopupMessage(`Error ${action}ing friend request`);
    }
  };

  // Remove friend from My Friends list
  const handleRemove = async (id) => {
    try {
      const params = new URLSearchParams();
      params.append('user_id', id);
      
      const response = await fetch(`${API_BASE_URL}connection/remove/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMyFriends(prev => prev.filter(friend => friend.id !== id));
        showPopupMessage('Friend removed successfully');
      } else {
        showPopupMessage(data.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      showPopupMessage('Error removing friend');
    }
  };

  // Determine which list to display based on activeTab
  const displayedList = activeTab === 'suggested' ? suggestedFriends : myFriends;

  // Filter by search term for friends and requests
  const filteredList = displayedList.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingRequests = pendingRequests.filter(request =>
    request.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter subscriptions based on search term
  const filteredSubscriptions = friendsSubscriptions.filter(subscription =>
    subscription.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscription.friend?.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format date function for subscriptions
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

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
        {/* Toggle Buttons - Updated width and flex settings */}
        <div className="subscription-toggle" style={{ 
          marginBottom: '20px',
          width: '100%',
          maxWidth: '800px',
          display: 'flex'
        }}>
          <button
            className={`toggle-button ${activeTab === 'suggested' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggested')}
            style={{ flex: 1, fontSize: '14px', padding: '0 4px' }}
          >
            Suggested
          </button>
          <button
            className={`toggle-button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{ flex: 1, fontSize: '14px', padding: '0 4px' }}
          >
            Pending Requests
          </button>
          <button
            className={`toggle-button ${activeTab === 'myFriends' ? 'active' : ''}`}
            onClick={() => setActiveTab('myFriends')}
            style={{ flex: 1, fontSize: '14px', padding: '0 4px' }}
          >
            My Friends
          </button>
          <button
            className={`toggle-button ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
            style={{ flex: 1, fontSize: '14px', padding: '0 4px' }}
          >
            Subscriptions
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-bar">
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder={activeTab === 'subscriptions' ? "Search subscriptions or friends" : "Search Friends"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Friends List - Suggested Tab */}
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
                    {pendingSentIds.includes(friend.id) ? (
                      <button
                        className="action-button"
                        style={{ 
                          backgroundColor: 'rgba(255, 193, 7, 0.2)',
                          border: '1px solid #FFC107',
                          color: '#FBFFFA',
                          cursor: 'default',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <FontAwesomeIcon icon={faClock} /> Pending
                      </button>
                    ) : (
                      <button
                        className="action-button"
                        onClick={() => handleConnect(friend.id)}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results-message">No search match found</p>
            )}
          </div>
        )}

        {/* Pending Friend Requests Tab */}
        {activeTab === 'pending' && (
          <div className="friends-list">
            {filteredPendingRequests.length > 0 ? (
              filteredPendingRequests.map(request => (
                <div className="subscription-item" key={request.id}>
                  <div className="subscription-left">
                    <div className="subscription-text">
                      <div className="subscription-name">{request.username}</div>
                      <div className="subscription-duration">
                        Sent you a friend request
                      </div>
                    </div>
                  </div>
                  <div className="subscription-right" style={{ gap: '10px' }}>
                    <button
                      className="action-button"
                      onClick={() => handleFriendRequest(request.id, 'accept')}
                      style={{ 
                        backgroundColor: 'rgba(100, 200, 150, 0.2)',
                        border: '1px solid #4CAF50',
                        color: '#FBFFFA',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 200, 150, 0.4)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 200, 150, 0.2)'}
                    >
                      Accept
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleFriendRequest(request.id, 'reject')}
                      style={{ 
                        backgroundColor: 'rgba(200, 100, 100, 0.2)',
                        border: '1px solid #f44336',
                        color: '#FBFFFA',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 100, 100, 0.4)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(200, 100, 100, 0.2)'}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results-message">No pending friend requests</p>
            )}
          </div>
        )}

        {/* Friends List - My Friends Tab */}
        {activeTab === 'myFriends' && (
          <div className="friends-list">
            {filteredList.length > 0 ? (
              filteredList.map(friend => (
                <div 
                  className="subscription-item"
                  key={friend.id}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="subscription-left">
                    <div className="subscription-text">
                      <div className="subscription-name">{friend.username}</div>
                      <div className="subscription-duration">
                        {friend.mutual_friends_count ? `${friend.mutual_friends_count} mutual friends` : 'Friend'}
                      </div>
                    </div>
                  </div>
                  <div className="subscription-right">
                    <Link
                      to={`/chats?user_id=${friend.id}`}
                      className="action-button"
                      style={{ 
                        textDecoration: 'none', 
                        display: 'inline-block',
                        marginRight: '10px'
                      }}
                    >
                      Chat
                    </Link>
                    <button
                      className="action-button"
                      onClick={() => handleRemove(friend.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-results-message">You have no friends</p>
            )}
          </div>
        )}

        {/* Friends Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="friends-list">
            {isLoading ? (
              <p className="loading-message">Loading subscriptions...</p>
            ) : filteredSubscriptions.length > 0 ? (
              filteredSubscriptions.map((subscription) => (
                <Link 
                  to={`/friend-subscription/${subscription.id}`} 
                  key={subscription.id}
                  state={{ subscription }}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="subscription-item">
                    <div className="subscription-left">
                      <div className="subscription-icon-container">
                        {subscription.logo ? (
                          <img
                            src={subscription.logo}
                            alt={`${subscription.service_name} Logo`}
                            className="subscription-icon"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://via.placeholder.com/48?text=${subscription.service_name.charAt(0)}`;
                            }}
                          />
                        ) : (
                          <div className="empty-icon-space"></div>
                        )}
                      </div>
                      <div className="subscription-text">
                        <div className="subscription-name">{subscription.service_name}</div>
                        <div className="subscription-duration">
                          Shared by: {subscription.friend.username}
                        </div>
                      </div>
                    </div>
                    <div className="subscription-right">
                      <div className="subscription-renewal-date">
                        Renews: {formatDate(subscription.renew_date)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="no-results-message">
                {searchTerm ? "No matching subscriptions found." : "No friends' subscriptions available."}
              </p>
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
