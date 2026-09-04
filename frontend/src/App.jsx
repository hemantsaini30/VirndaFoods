// src/App.jsx
// Routing skeleton only. No auth guarding of routes yet — that arrives once
// the auth module exists (Phase 2 backend, corresponding later frontend phase).

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CustomerHome from './pages/CustomerHome';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/customer" element={<CustomerHome />} />
        <Route path="/restaurant" element={<RestaurantDashboard />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
