import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Minimal, role-aware nav bar — closes the gap flagged at the end of
// Phase 3 (no navigation existed anywhere; /apply/restaurant and
// /apply/driver were reachable only by typed URL). Scope is deliberately
// small: a logo/home link, role-specific links, and logout. Full
// search/filtering UI polish is Phase 5's job.
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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