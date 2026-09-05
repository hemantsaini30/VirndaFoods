// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerHome from './pages/customer/CustomerHome';
import RestaurantApplicationPage from './pages/customer/RestaurantApplicationPage';
import DeliveryPartnerApplicationPage from './pages/customer/DeliveryPartnerApplicationPage';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER']}>
                <CustomerHome />
              </ProtectedRoute>
            }
          />

          {/* Application forms — accessible to the roles the backend
              actually allows to submit each application type. No nav
              link exists for these yet (no navbar has been built); reach
              them by URL until a later phase adds navigation. */}
          <Route
            path="/apply/restaurant"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'DELIVERY_PARTNER']}>
                <RestaurantApplicationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply/driver"
            element={
              <ProtectedRoute allowedRoles={['CUSTOMER', 'RESTAURANT_OWNER']}>
                <DeliveryPartnerApplicationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/restaurant"
            element={
              <ProtectedRoute allowedRoles={['RESTAURANT_OWNER']}>
                <RestaurantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['DELIVERY_PARTNER']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}