import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import cartApi from '../../api/endpoints/cartApi';

// Minimal, role-aware nav bar — closes the gap flagged at the end of
// Phase 3 (no navigation existed anywhere; /apply/restaurant and
// /apply/driver were reachable only by typed URL). Phase 5 adds a cart
// item-count badge, visible only to CUSTOMER, linking to the new cart
// page. Scope otherwise stays deliberately small: no search bar or
// notification bell yet (those come with their own future modules).
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  // Fetches the cart count once whenever the user becomes a logged-in
  // CUSTOMER (e.g. on login, or on page load if a session was restored).
  // This does NOT live-update after every add/remove elsewhere in the
  // app — CartPage and RestaurantDetailPage manage their own state
  // locally, and the badge simply reflects the count as of the last time
  // this effect ran. A perfectly always-in-sync badge would need shared
  // cart state (e.g. lifted into AuthContext or a dedicated CartContext)
  // — deliberately not introduced this phase per the master prompt's
  // "Context API, upgrade only if a real need appears" rule. Flagging
  // this as a known minor staleness tradeoff, not an oversight.
  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') {
      setCartCount(0);
      return;
    }
    let cancelled = false;
    cartApi
      .getCart()
      .then((res) => {
        if (!cancelled) {
          const count = res.data.cart.items.reduce((sum, item) => sum + item.quantity, 0);
          setCartCount(count);
        }
      })
      .catch(() => {
        // Silently ignore — a failed badge fetch shouldn't disrupt
        // navigation or show an error state for something this minor.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          FoodDelivery
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          {!user && (
            <>
              <Link to="/login" className="text-gray-700 hover:text-gray-900">
                Log in
              </Link>
              <Link to="/register" className="text-gray-700 hover:text-gray-900">
                Sign up
              </Link>
            </>
          )}

          {user && user.role === 'CUSTOMER' && (
            <>
              <Link to="/restaurants" className="text-gray-700 hover:text-gray-900">
                Browse restaurants
              </Link>
              <Link to="/cart" className="relative text-gray-700 hover:text-gray-900">
                Cart
                {cartCount > 0 && (
                  <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link to="/apply/restaurant" className="text-gray-700 hover:text-gray-900">
                List your restaurant
              </Link>
              <Link to="/apply/driver" className="text-gray-700 hover:text-gray-900">
                Become a driver
              </Link>
            </>
          )}

          {user && user.role === 'RESTAURANT_OWNER' && (
            <>
              <Link to="/restaurant" className="text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/apply/driver" className="text-gray-700 hover:text-gray-900">
                Become a driver
              </Link>
            </>
          )}

          {user && user.role === 'DELIVERY_PARTNER' && (
            <>
              <Link to="/driver" className="text-gray-700 hover:text-gray-900">
                Driver dashboard
              </Link>
              <Link to="/apply/restaurant" className="text-gray-700 hover:text-gray-900">
                List a restaurant
              </Link>
            </>
          )}

          {user && user.role === 'ADMIN' && (
            <Link to="/admin" className="text-gray-700 hover:text-gray-900">
              Admin panel
            </Link>
          )}

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="text-gray-700 hover:text-gray-900"
            >
              Log out
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}