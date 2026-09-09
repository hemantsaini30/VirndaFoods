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
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
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

            {/* Public restaurant browsing — Phase 4, extended with
                search/sort in Phase 5. No auth required to view. */}
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

            {/* Phase 5. Cart is per-customer, so CUSTOMER-only, same
                pattern as every other role-scoped route here. */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CartPage />
                </ProtectedRoute>
              }
            />

            {/* New in Phase 6. Checkout, order confirmation/detail, and
                order history — all CUSTOMER-only, same reasoning as
                /cart above: these are all steps in a single customer
                purchase flow, so they're grouped together here. /orders/:id
                serves as BOTH the post-checkout confirmation screen
                (CheckoutPage redirects here on success) and the general
                order-detail view reached from /orders — see
                OrderDetailPage.jsx's own comment for why there's no
                separate confirmation route. */}
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <OrderHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER']}>
                  <OrderDetailPage />
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