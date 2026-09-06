import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import restaurantsApi from '../../api/endpoints/restaurantsApi';
import menuApi from '../../api/endpoints/menuApi';
import cartApi from '../../api/endpoints/cartApi';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';

// Public restaurant + menu view. Phase 5 wires up real "Add to cart"
// buttons (previously a disabled placeholder). Only a logged-in CUSTOMER
// can actually add — everyone else still sees the menu, but the button is
// disabled with an explanatory title, same visual pattern as the
// unavailable-item case.
export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  // Per-item "adding…" state, keyed by foodItemId, so clicking one item's
  // button doesn't disable every other button on the page.
  const [addingItemId, setAddingItemId] = useState(null);
  const [addError, setAddError] = useState(null);

  // Holds the pending add when the different-restaurant conflict fires,
  // so the confirmation dialog can retry it after the cart is cleared.
  const [pendingConflictItem, setPendingConflictItem] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([restaurantsApi.getById(id), menuApi.getMenu(id)])
      .then(([restaurantRes, menuRes]) => {
        if (cancelled) return;
        setRestaurant(restaurantRes.data.restaurant);
        setCategories(menuRes.data.categories);
        setStatus('success');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleAddToCart(foodItemId) {
    setAddError(null);
    setAddingItemId(foodItemId);
    try {
      await cartApi.addItem(foodItemId, 1);
      navigate('/cart');
    } catch (err) {
      // CART_RESTAURANT_CONFLICT is the server's distinguishable code for
      // "your cart has items from a different restaurant" — everything
      // else is shown as a plain error message rather than the
      // clear-cart prompt, since that prompt only makes sense for this
      // one specific situation.
      const code = err.response?.data?.error?.code;
      if (code === 'CART_RESTAURANT_CONFLICT') {
        setPendingConflictItem(foodItemId);
      } else {
        setAddError("Couldn't add that item. Please try again.");
      }
    } finally {
      setAddingItemId(null);
    }
  }

  async function handleConfirmClearAndAdd() {
    const foodItemId = pendingConflictItem;
    setPendingConflictItem(null);
    setAddError(null);
    setAddingItemId(foodItemId);
    try {
      await cartApi.clearCart();
      await cartApi.addItem(foodItemId, 1);
      navigate('/cart');
    } catch {
      setAddError("Couldn't switch restaurants. Please try again.");
    } finally {
      setAddingItemId(null);
    }
  }

  function handleCancelConflict() {
    setPendingConflictItem(null);
  }

  if (status === 'loading') return <p className="text-gray-500">Loading…</p>;
  if (status === 'error') {
    return <p className="text-red-600">Couldn't load this restaurant. Please try again.</p>;
  }

  const isCustomer = user?.role === 'CUSTOMER';

  return (
    <div>
      <div className="mb-6">
        {restaurant.imageUrl && (
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="mb-3 h-48 w-full rounded object-cover"
          />
        )}
        <h1 className="text-2xl font-semibold text-gray-900">{restaurant.name}</h1>
        <p className="text-sm text-gray-500">
          {restaurant.address}, {restaurant.city}
        </p>
      </div>

      {addError && <p className="mb-4 text-sm text-red-600">{addError}</p>}

      {categories.length === 0 && (
        <p className="text-gray-500">This restaurant hasn't added any menu items yet.</p>
      )}

      {categories.map((category) => (
        <div key={category.id} className="mb-6">
          <h2 className="mb-2 text-lg font-medium text-gray-900">{category.name}</h2>
          <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {category.foodItems.map((item) => {
              const disabled = !item.isAvailable || !isCustomer || addingItemId === item.id;
              const title = !item.isAvailable
                ? 'Currently unavailable'
                : !isCustomer
                  ? 'Log in as a customer to order'
                  : undefined;

              return (
                <li key={item.id} className="flex items-center justify-between gap-4 p-3">
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-14 w-14 rounded object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500">{item.description}</p>
                      )}
                      <p className="text-sm text-gray-700">₹{item.priceInRupees.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    title={title}
                    onClick={() => handleAddToCart(item.id)}
                    className="rounded border border-blue-600 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    {addingItemId === item.id ? 'Adding…' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {pendingConflictItem && (
        <ConfirmModal
          title="Start a new cart?"
          message="Your cart has items from a different restaurant. Adding this item will clear your current cart."
          confirmLabel="Clear cart and add"
          cancelLabel="Cancel"
          onConfirm={handleConfirmClearAndAdd}
          onCancel={handleCancelConflict}
        />
      )}
    </div>
  );
}