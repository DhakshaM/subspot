import React, { useState, useEffect } from 'react';
import './Market.css';  
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faSearch, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';  
import ChatIcon from './ChatIcon'; 


// function parseDurationToDays(durationStr) {
//   switch (durationStr) {
//     case '1 month':
//       return 30;
//     case '2 months':
//       return 60;
//     case '3 months':
//       return 90;
//     case '6 months':
//       return 180;
//     case '1 year':
//       return 365;
//     default:
//       return 30; 
//   }
// }

function Market() {
  // Track which tab is active: "buy", "sell", or "expired"
  const [activeTab, setActiveTab] = useState('buy');
  // For searching subscriptions (Buy tab)
  const [searchTerm, setSearchTerm] = useState('');

  // Show/hide the Sell form
  const [showSellForm, setShowSellForm] = useState(false);
  // Show/hide the Sold History
  const [showSoldHistory, setShowSoldHistory] = useState(false);

  // For the "Buy" modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Use navigate hook
  const navigate = useNavigate();  // <-- used for programmatic navigation

  //user dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ username: '', email: '' });
  const API_BASE_URL = 'http://localhost:8000/subspot/';

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

  // // Example icons
  // const subscriptionIcons = {
  //   'Spotify Premium': 'https://img.icons8.com/fluency/48/spotify.png',
  //   'Netflix': 'https://img.icons8.com/color/48/netflix-desktop-app.png',
  //   'Amazon Prime': 'https://img.icons8.com/color/48/amazon.png',
  //   'YouTube Premium': 'https://img.icons8.com/color/48/youtube-play.png'
  // };

  // // Example user subscriptions (for the "Add to Sell" form)
  // const [userSubscriptions] = useState([
  //   { id: 1, name: 'Spotify Premium', duration: '1 month' },
  //   { id: 2, name: 'Netflix', duration: '2 months' },
  //   { id: 3, name: 'Coursera', duration: '1 month' },
  //   { id: 4, name: 'YouTube Premium', duration: '3 months' },
  //   { id: 5, name: 'iCloud', duration: '1 month' }
  // ]);

  // // Sample items in the Buy tab
  // const subscriptionItems = [
  //   { id: 1, name: 'Spotify Premium', duration: '1 month', price: 149 },
  //   { id: 2, name: 'Netflix', duration: '2 months', price: 299 },
  //   { id: 3, name: 'Amazon Prime', duration: '1 month', price: 129 },
  //   { id: 4, name: 'YouTube Premium', duration: '2 months', price: 249 },
  // ];

  // // Items currently for sale (Sell tab)
  // const [sellItems, setSellItems] = useState([
  //   {
  //     id: 101,
  //     name: 'YouTube Premium',
  //     duration: '2 months ago',
  //     price: 599,
  //     validUntil: null,
  //   },
  //   {
  //     id: 102,
  //     name: 'Spotify Premium',
  //     duration: '1 month ago',
  //     price: 199,
  //     validUntil: null,
  //   },
  // ]);

  const [subscriptionItems, setSubscriptionItems] = useState([]);
  const [sellItems, setSellItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [expiredItems, setExpiredItems] = useState([]);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  
  // Fetch data when component mounts and tab changes
  useEffect(() => {
    if (activeTab === 'buy') {
      fetchAvailableListings();
    } else if (activeTab === 'sell') {
      fetchUserUnsoldListings();
    } else if (activeTab === 'expired') {
      fetchExpiredListings();
    }
  }, [activeTab]);

  // Also fetch user's subscriptions for the sell form
  useEffect(() => {
    fetch(`${API_BASE_URL}subscriptions/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        // Transform subscription data for the dropdown
        const formattedSubs = data.map(sub => ({
          id: sub.id,
          name: sub.name,
          duration: sub.billing_cycle === 'monthly' ? '1 month' : 
                    sub.billing_cycle === 'quarterly' ? '3 months' : '1 year'
        }));
        setUserSubscriptions(formattedSubs);
      })
      .catch(err => console.error('Error fetching user subscriptions:', err));
  }, []);


  // Fetch available listings for Buy tab
  const fetchAvailableListings = () => {
    fetch(`${API_BASE_URL}listings/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSubscriptionItems(data);
      })
      .catch(err => console.error('Error fetching listings:', err));
  };

  // Fetch user's unsold listings for Sell tab
  const fetchUserUnsoldListings = () => {
    fetch(`${API_BASE_URL}unsold-listings/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSellItems(data);
      })
      .catch(err => console.error('Error fetching unsold listings:', err));

    // Also fetch sold listings for history
    fetch(`${API_BASE_URL}sold-listings/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setSoldItems(data);
      })
      .catch(err => console.error('Error fetching sold listings:', err));
  };

  // Fetch expired listings
  const fetchExpiredListings = () => {
    fetch(`${API_BASE_URL}unsold-expired-listings/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setExpiredItems(data);
      })
      .catch(err => console.error('Error fetching expired listings:', err));
  };

  // Mark subscription as sold
  const handleSold = (id) => {
    const formData = new FormData();
    formData.append('listing_id', id);

    fetch(`${API_BASE_URL}mark-sold/`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          // Remove from sell items and refresh listings
          fetchUserUnsoldListings();
        }
      })
      .catch(err => console.error('Error marking as sold:', err));
  };

  // Save the updated price
  const handleSavePrice = (id) => {
    const formData = new FormData();
    formData.append('listing_id', id);
    formData.append('new_price', tempPrice);

    fetch(`${API_BASE_URL}edit-listing-price/`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          // Update the UI
          setSellItems(prev =>
            prev.map(item => {
              if (item.id === id) {
                return { ...item, price: parseInt(tempPrice, 10) || item.price };
              }
              return item;
            })
          );
        }
      })
      .catch(err => console.error('Error updating price:', err));

    setEditingPriceId(null);
    setTempPrice('');
  };

  // Delete a sell item
  const handleDeleteSellItem = (id) => {
    fetch(`${API_BASE_URL}listings/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ listing_id: id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          // Remove from UI
          setSellItems(prev => prev.filter(item => item.id !== id));
        }
      })
      .catch(err => console.error('Error deleting listing:', err));
  };

  


  // Handle subscription selection in Sell form
const handleSelectedSubscriptionChange = (e) => {
  const selectedId = e.target.value;
  setSelectedDashboardSub(selectedId);
};

// Submit the Sell form
const handleSellFormSubmit = (e) => {
  e.preventDefault();
  if (!selectedDashboardSub || !sellPrice) {
    alert("Please select a subscription and enter a selling price.");
    return;
  }

  const urlEncodedData = new URLSearchParams();
  urlEncodedData.append('subscription_id', selectedDashboardSub);
  urlEncodedData.append('price', sellPrice);

  fetch(`${API_BASE_URL}listings/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: urlEncodedData.toString()
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.message && data.message.includes('successfully')) {
        // Refresh the listings
        fetchUserUnsoldListings();
        // Reset form
        setSelectedDashboardSub('');
        setSellPrice('');
        setShowSellForm(false);
      } else {
        alert(data.message || 'Failed to create listing');
      }
    })
    .catch(err => {
      console.error('Error creating listing:', err);
      alert('An error occurred while creating the listing.');
    });
};







  // // Items that expired
  // const [expiredItems, setExpiredItems] = useState([
  //   {
  //     id: 201,
  //     name: 'Amazon Prime',
  //     price: 129,
  //     validUntil: null,
  //   },
  //   {
  //     id: 202,
  //     name: 'Netflix',
  //     price: 199,
  //     validUntil: null,
  //   },
  // ]);

  // For the Sell form
  const [selectedDashboardSub, setSelectedDashboardSub] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  // ----- NEW STATES & FUNCTIONS for inline price editing -----
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');

  // Start editing a particular subscription’s price
  const handlePriceEdit = (id, currentPrice) => {
    setEditingPriceId(id);
    setTempPrice(String(currentPrice)); // keep it as string for input
  };

  // Cancel price editing
  const handleCancelPriceEdit = () => {
    setEditingPriceId(null);
    setTempPrice('');
  };
  // -----------------------------------------------------------

  // Filter items based on search (Buy tab)
  const filteredItems = subscriptionItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle switching between tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'sell') {
      setShowSellForm(false);
      setShowSoldHistory(false);
    }
  };


  // Toggle the sell form
  const handleAddSubscriptionClick = () => {
    setShowSellForm((prev) => !prev);
    setShowSoldHistory(false);
  };

  // Toggle the sold history
  const handleSellHistoryClick = () => {
    setShowSoldHistory((prev) => !prev);
    setShowSellForm(false);
  };

  
  // Handle "Buy" button
  const handleBuyClick = (item) => {
    setSelectedItem(item);
    setShowBuyModal(true);
  };

  // Close the Buy modal
  const handleCloseBuyModal = () => {
    setShowBuyModal(false);
    setSelectedItem(null);
  };

  // Update the handleContactSeller function to use the existing seller_id
  const handleContactSeller = () => {
    if (!selectedItem || !selectedItem.seller_id) {
      console.error("No seller ID available for this listing");
      return;
    }
    
    // Navigate to the chat page with the seller's user ID
    navigate(`/chats?user_id=${selectedItem.seller_id}`);
    handleCloseBuyModal();
  };

  
  return (
    <div className="market-container">
      {/* Header / Navbar */}
      <header className="market-header">
        <nav className="market-nav">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/market" className="nav-link active">Market</Link>
          <Link to="/friends" className="nav-link">Friends</Link>
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
          {/* ChatIcon added next to user icon */}
          <div style={{ marginLeft: '20px' }}>
            <ChatIcon />
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="market-content">
        {/* Toggle Buttons */}
        <div className="subscription-toggle">
          <button
            className={`toggle-button ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => handleTabChange('buy')}
          >
            Buy Subscription
          </button>
          <button
            className={`toggle-button ${activeTab === 'sell' ? 'active' : ''}`}
            onClick={() => handleTabChange('sell')}
          >
            Sell Subscription
          </button>
          <button
            className={`toggle-button ${activeTab === 'expired' ? 'active' : ''}`}
            onClick={() => handleTabChange('expired')}
          >
            Expired Subscriptions
          </button>
        </div>

        {/* Search Bar (only for Buy) */}
        {activeTab === 'buy' && (
          <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {/* Buy Tab */}
        {activeTab === 'buy' && (
          <div className="buy-section">
            {filteredItems.length === 0 ? (
              <p>No subscriptions are available for purchase.</p>
            ) : (
              filteredItems.map((item) => (
                <div className="subscription-item" key={item.id}>
                  <div className="subscription-left">
                    <div className="subscription-icon-container">
                      {item.logo ? (
                        <img
                          src={item.logo}
                          alt={item.name}
                          className="subscription-icon"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/48?text=" + item.name.charAt(0);
                          }}
                        />
                      ) : (
                        <div className="empty-icon-space"></div>
                      )}
                    </div>
                    <div className="subscription-text">
                      <div className="subscription-name">{item.name}</div>
                      <div className="subscription-duration">{item.duration}</div>
                    </div>
                  </div>
                  <div className="subscription-right">
                    <span className="subscription-price">Rs. {item.price}</span>
                    <button
                      className="action-button"
                      onClick={() => handleBuyClick(item)}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sell Tab */}
        {activeTab === 'sell' && (
          <div className="sell-section">
            {/* Sell History (unsold items) */}
            <div className="sell-history">
              {sellItems.map((item) => (
                <div className="subscription-item" key={item.id}>
                  <div className="subscription-left">
                    <div className="subscription-icon-container">
                      {item.logo ? (
                        <img
                          src={item.logo}
                          alt={item.name}
                          className="subscription-icon"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/48?text=" + item.name.charAt(0);
                          }}
                        />
                      ) : (
                        <div className="empty-icon-space"></div>
                      )}
                    </div>
                    <div className="subscription-text">
                      <div className="subscription-name">{item.name}</div>
                      <div className="subscription-duration">{item.duration}</div>
                    </div>
                  </div>
                  <div className="subscription-right">
                    {editingPriceId === item.id ? (
                      <>
                        <input
                          type="number"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          style={{
                            width: '70px',
                            borderRadius: '4px',
                            padding: '3px 5px'
                          }}
                        />
                        <button
                          className="action-button"
                          onClick={() => handleSavePrice(item.id)}
                        >
                          Save
                        </button>
                        <button
                          className="action-button"
                          onClick={handleCancelPriceEdit}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="subscription-price">Rs. {item.price}</span>
                        <button
                          className="action-button"
                          onClick={() => handlePriceEdit(item.id, item.price)}
                        >
                          Edit
                        </button>
                      </>
                    )}
                    <button
                      className="action-button"
                      onClick={() => handleSold(item.id)}
                    >
                      Sold
                    </button>
                    <FontAwesomeIcon
                      icon={faTrash}
                      className="delete-icon"
                      onClick={() => handleDeleteSellItem(item.id)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons for Add Subscription & Sell History */}
            <div
              className={`sell-buttons-container ${
                !showSellForm ? 'two-buttons' : 'one-button'
              }`}
            >
              {!showSellForm && (
                <button
                  className="action-button add-subscription-button"
                  onClick={handleAddSubscriptionClick}
                >
                  Add to Sell
                </button>
              )}
              <button
                className="action-button sell-history-button"
                onClick={handleSellHistoryClick}
              >
                History
              </button>
            </div>

            {/* Sell Form */}
            {showSellForm && (
              <form className="sell-form" onSubmit={handleSellFormSubmit}>
                <div className="form-group">
                  <label>Select Subscription</label>
                  <select
                    name="selectedSub"
                    value={selectedDashboardSub}
                    onChange={handleSelectedSubscriptionChange}
                    required
                  >
                    <option value="" disabled>Select from your subscriptions</option>
                    {userSubscriptions.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Selling Price</label>
                  <input
                    type="number"
                    name="price"
                    placeholder="Enter selling price"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    required
                  />
                </div>
                <button className="action-button sell-button" type="submit">
                  Sell Subscription
                </button>
              </form>
            )}

            {/* Sold Items History */}
            {showSoldHistory && (
              <div className="sold-history">
                <h3>Sold History</h3>
                {soldItems.length === 0 ? (
                  <p>No subscriptions sold yet.</p>
                ) : (
                  soldItems.map((item) => (
                    <div className="subscription-item" key={item.id}>
                      <div className="subscription-left">
                        <div className="subscription-icon-container">
                          {item.logo ? (
                            <img
                              src={item.logo}
                              alt={item.name}
                              className="subscription-icon"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/48?text=" + item.name.charAt(0);
                              }}
                            />
                          ) : (
                            <div className="empty-icon-space"></div>
                          )}
                        </div>
                        <div className="subscription-text">
                          <div className="subscription-name">{item.name}</div>
                          <div className="subscription-duration">{item.duration}</div>
                        </div>
                      </div>
                      <div className="subscription-right">
                        <span className="subscription-price">Rs. {item.price}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Expired Tab */}
        {activeTab === 'expired' && (
          <div className="sell-section">
            {expiredItems.length === 0 ? (
              <p>No subscriptions have expired yet.</p>
            ) : (
              expiredItems.map((item) => (
                <div className="subscription-item" key={item.id}>
                  <div className="subscription-left">
                    <div className="subscription-icon-container">
                      {item.logo ? (
                        <img
                          src={item.logo}
                          alt={item.name}
                          className="subscription-icon"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/48?text=" + item.name.charAt(0);
                          }}
                        />
                      ) : (
                        <div className="empty-icon-space"></div>
                      )}
                    </div>
                    <div className="subscription-text">
                      <div className="subscription-name">{item.name}</div>
                    </div>
                  </div>
                  <div className="subscription-right">
                    <span className="subscription-price">Rs. {item.price}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL: Single "Contact Seller" Button */}
      {showBuyModal && selectedItem && (
        <div className="buy-modal-overlay">
          <div className="buy-modal-content">
            <button className="buy-modal-close" onClick={handleCloseBuyModal}>
              &times;
            </button>
            <h2>Purchase {selectedItem.name}</h2>
            <p>Duration: {selectedItem.duration}</p>
            <p>Price: Rs. {selectedItem.price}</p>
            <div className="buy-modal-actions">
              <button className="action-button" onClick={handleContactSeller}>
                Contact Seller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Market;
