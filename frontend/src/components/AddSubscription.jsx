import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import './AddSubscription.css'; // Updated CSS below

function AddSubscription() {
  const navigate = useNavigate();
  const [newSubscriptionName, setNewSubscriptionName] = useState('');
  const [newSubscriptionCost, setNewSubscriptionCost] = useState('');
  const [newSubscriptionReminder, setNewSubscriptionReminder] = useState('monthly');
  const [newSubscriptionSharable, setNewSubscriptionSharable] = useState(true);
  const [newSubscriptionAutoRenew, setNewSubscriptionAutoRenew] = useState(false);
  
  const API_BASE_URL = 'http://localhost:8000/subspot/';

  const handleAddSubscription = (e) => {
    e.preventDefault();
    const newSubscription = {
      name: newSubscriptionName,
      reminder: newSubscriptionReminder,
      cost: newSubscriptionCost,
      is_shareable: newSubscriptionSharable,
      is_autorenew: newSubscriptionAutoRenew,
    };

    fetch(`${API_BASE_URL}subscriptions/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSubscription),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        // After adding, navigate back to Dashboard or wherever needed
        navigate('/dashboard');
      })
      .catch((err) => console.error('Error adding subscription:', err));
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  return (
    <div className="add-subscription-container">
      <div className="form-header">
        <h2>Add Subscription</h2>
        <button className="close-button" onClick={handleClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <form onSubmit={handleAddSubscription}>
        <div className="input-group">
          <label>Service Name:</label>
          <input
            type="text"
            placeholder="Enter service name"
            value={newSubscriptionName}
            onChange={(e) => setNewSubscriptionName(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Cost:</label>
          <input
            type="number"
            placeholder="Enter cost"
            value={newSubscriptionCost}
            onChange={(e) => setNewSubscriptionCost(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Billing Cycle:</label>
          <select
            value={newSubscriptionReminder}
            onChange={(e) => setNewSubscriptionReminder(e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="input-group">
          <label>Sharable:</label>
          <select
            value={newSubscriptionSharable ? 'yes' : 'no'}
            onChange={(e) => setNewSubscriptionSharable(e.target.value === 'yes')}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="input-group">
          <label>Auto Renew:</label>
          <select
            value={newSubscriptionAutoRenew ? 'yes' : 'no'}
            onChange={(e) => setNewSubscriptionAutoRenew(e.target.value === 'yes')}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <button className="submit-button" type="submit">Add Subscription</button>
      </form>
    </div>
  );
}

export default AddSubscription;
