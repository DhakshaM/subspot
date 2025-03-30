import React, { useState, useMemo, useEffect } from 'react';
import './Dashboard.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, Link } from 'react-router-dom';
import ChatIcon from './ChatIcon';

function Dashboard() {
  const navigate = useNavigate();
  const [expenseRange, setExpenseRange] = useState('Past year');
  const [showSubscriptions, setShowSubscriptions] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [expenseData, setExpenseData] = useState({ months: [], barHeights: [] });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({ username: '', email: '' });

  const API_BASE_URL = 'http://localhost:8000/subspot/';

  useEffect(() => {
    // Fetch user info
    fetch(`${API_BASE_URL}auth/user/`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          navigate('/');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setUserInfo({ username: data.username, email: data.email });
        }
      })
      .catch(err => console.error('Error fetching user info:', err));

    // Fetch subscriptions
    fetch(`${API_BASE_URL}subscriptions/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSubscriptions(data))
      .catch(err => console.error('Error fetching subscriptions:', err));

    // Fetch reminders
    fetch(`${API_BASE_URL}reminders/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setReminders(data))
      .catch(err => console.error('Error fetching reminders:', err));

    // Fetch expense data
    fetch(`${API_BASE_URL}expenses/?range=${expenseRange.toLowerCase().replace(' ', '_')}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setExpenseData({ months: data.months || [], barHeights: data.barHeights || [] }))
      .catch(err => console.error('Error fetching expenses:', err));
  }, [expenseRange, navigate]);

  const handleTabClick = (tab) => setShowSubscriptions(tab === 'subscriptions');

  const handleMarkReminderDone = (id) => {
    fetch(`${API_BASE_URL}mark-paid/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ subscription_id: id }),
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Refresh reminders
          fetch(`${API_BASE_URL}reminders/`, { credentials: 'include' })
            .then(res => res.json())
            .then(reminderData => setReminders(reminderData))
            .catch(err => console.error('Error refreshing reminders:', err));
        } else {
          console.error('Failed to mark reminder done:', data.error);
        }
      })
      .catch(err => console.error('Error marking reminder done:', err));
  };

  const handleExpenseRangeChange = (event) => setExpenseRange(event.target.value);

  const handleDeleteSubscription = (id) => {
    fetch(`${API_BASE_URL}subscriptions/${id}/`, {
      method: 'DELETE',
      credentials: 'include',
    })
      .then(() => {
        setSubscriptions(subscriptions.filter(sub => sub.id !== id));
        setReminders(reminders.filter(reminder => reminder.id !== id));
      })
      .catch(err => console.error('Error deleting subscription:', err));
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

  // Filter expense data
  const filteredExpenseData = useMemo(() => {
    const allMonths = expenseData.months || [];
    const allBarHeights = expenseData.barHeights || [];
    const currentMonthIndex = new Date().getMonth();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const orderedMonths = [];
    const orderedHeights = [];
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonthIndex - 11 + i + 12) % 12;
      orderedMonths.push(monthNames[monthIndex]);
      const backendIndex = allMonths.indexOf(monthNames[monthIndex]);
      orderedHeights.push(backendIndex !== -1 ? allBarHeights[backendIndex] : 0);
    }

    let filteredMonths = [];
    let filteredHeights = [];

    if (expenseRange === 'Last month') {
      filteredMonths = [orderedMonths[11]];
      filteredHeights = [orderedHeights[11]];
    } else if (expenseRange === 'Last 6 months') {
      filteredMonths = orderedMonths.slice(6, 12);
      filteredHeights = orderedHeights.slice(6, 12);
    } else {
      filteredMonths = orderedMonths;
      filteredHeights = orderedHeights;
    }

    return { months: filteredMonths, barHeights: filteredHeights };
  }, [expenseData, expenseRange]);

  const months = filteredExpenseData.months;
  const barHeights = filteredExpenseData.barHeights;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <nav className="dashboard-nav">
          <div className="nav-links">
            <Link to="/dashboard" className="nav-link active">Dashboard</Link>
            <Link to="/market" className="nav-link">Market</Link>
            <Link to="/friends" className="nav-link">Friends</Link>
          </div>
          <div className="nav-icons">
            <div className="user-icon" onClick={toggleDropdown}>
              <FontAwesomeIcon icon={faCircleUser} />
              {isDropdownOpen && (
                <div className="user-dropdown">
                  <p>Username: <span className="value">{userInfo.username}</span></p>
                  <p>Email: <span className="value">{userInfo.email}</span></p>
                  <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
            <div className="chat-icon">
              <ChatIcon />
            </div>
          </div>
        </nav>
      </header>

      <main className="dashboard-content">
        <section className="expense-section">
          <div className="expense-header">
            <h2 className="section-title">Expense</h2>
            <select
              className="expense-range-select"
              value={expenseRange}
              onChange={(e) => setExpenseRange(e.target.value)}
            >
              <option value="Past year">Past year</option>
              <option value="Last month">Last month</option>
              <option value="Last 6 months">Last 6 months</option>
            </select>
          </div>
          <div className="expense-chart">
            <div className="chart-y-axis">
              <span>Rs.3000</span>
              <span>Rs.2000</span>
              <span>Rs.1000</span>
              <span>Rs.0</span>
            </div>
            <div className="chart-bars">
              {barHeights.map((height, index) => (
                <div key={index} className="chart-bar" style={{ height: `${(height / 3000) * 100}%` }} />
              ))}
            </div>
            <div className="chart-labels">
              {months.map((month, index) => (
                <span key={index}>{month.slice(0, 3)}</span>
              ))}
            </div>
            <div className="chart-horizontal-lines">
              <div className="horizontal-line"></div>
              <div className="horizontal-line"></div>
              <div className="horizontal-line"></div>
              <div className="horizontal-line"></div>
            </div>
          </div>
        </section>

        <section className="subscriptions-section">
          <div className="section-tabs">
            <button className={`tab-button ${showSubscriptions ? 'active' : ''}`} onClick={() => handleTabClick('subscriptions')}>
              Subscriptions
            </button>
            <button className={`tab-button ${!showSubscriptions ? 'active' : ''}`} onClick={() => handleTabClick('reminders')}>
              Reminders
            </button>
          </div>

          <div className="subscription-list">
            {showSubscriptions ? (
              <>
                {subscriptions.map((subscription) => (
                  <Link
                    to={`/subscription/${subscription.id}`}
                    state={{ user: userInfo, subscription }}
                    className="subscription-item"
                    key={subscription.id}
                  >
                    <div className="subscription-logo">
                      {subscription.logo && (
                        <img
                          src={subscription.logo}
                          alt={`${subscription.name} Logo`}
                          style={{ width: '32px', height: '32px' }}
                        />
                      )}
                    </div>
                    <div className="subscription-name">{subscription.name}</div>
                    <div className="subscription-cost">Rs. {subscription.cost}</div>
                  </Link>
                ))}
                <button className="add-subscriptions-button" onClick={() => navigate('/add-subscription')}>
                  <FontAwesomeIcon icon={faPlus} /> Add Subscription
                </button>
              </>
            ) : (
              <div className="reminder-list">
                {reminders.length === 0 ? (
                  <p className="no-results-message">
                    Yay! You have no reminders – enjoy your free time!
                  </p>
                ) : (
                  reminders.map((reminder) => (
                    <div className="reminder-item" key={reminder.id}>
                      <div className="reminder-date">
                        <span className="reminder-month">{reminder.end_date?.split(' ')[0]}</span>
                        <span className="reminder-day">{reminder.end_date?.split(' ')[1]}</span>
                      </div>
                      <div className="reminder-name">{reminder.name}</div>
                      <div className="reminder-cost">Rs. {reminder.cost}</div>
                      <button className="done-button" onClick={() => handleMarkReminderDone(reminder.id)}>
                        Done
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
