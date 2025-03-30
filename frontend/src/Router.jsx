import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Market from './components/Market';
import SubscriptionDetails from './components/SubscriptionDetails'; 
import Friends from './components/Friends';
import ChatListPage from './components/ChatListPage';
import AddSubscription from './components/AddSubscription'; // New component

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/market" element={<Market />} />
      <Route path="/subscription/:id" element={<SubscriptionDetails />} /> 
      <Route path="/friends" element={<Friends />} />
      <Route path="/chats" element={<ChatListPage />} />
      <Route path="/add-subscription" element={<AddSubscription />} />
    </Routes>
  );
};

export default AppRouter;
