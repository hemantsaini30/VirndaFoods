import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerHome from './pages/customer/CustomerHome';
import RestaurantApplicationPage from './pages/customer/RestaurantApplicationPage';
import DeliveryPartnerApplicationPage from './pages/customer/DeliveryPartnerApplicationPage';
import RestaurantsListPage from './pages/customer/RestaurantsListPage';
import RestaurantDetailPage from './pages/customer/RestaurantDetailPage';
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public restaurant browsing — new in Phase 4. Minimal by
                design; full search/filter polish is Phase 5's job. No auth
                required to view. */}
            <Route path="/restaurants" element={<RestaurantsListPage />} />
            <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />

            <Route
              path="/customer"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CustomerHome />
                </ProtectedRoute>
              }
            />

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
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}