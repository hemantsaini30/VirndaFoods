import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import cartApi from '../../api/endpoints/cartApi';
import ConfirmModal from '../../components/common/ConfirmModal';

function formatRupees(amount) {
  return `₹${amount.toFixed(2)}`;
}

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [actionError, setActionError] = useState(null);
  const [busyItemId, setBusyItemId] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  function loadCart() {
    setStatus('loading');
    return cartApi
      .getCart()
      .then((res) => {
        setCart(res.data.cart);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function handleQuantityChange(cartItemId, nextQuantity) {
    if (nextQuantity < 1) return; // removal goes through handleRemove, not quantity 0
    setActionError(null);
    setBusyItemId(cartItemId);
    try {
      const res = await cartApi.updateItemQuantity(cartItemId, nextQuantity);
      setCart(res.data.cart);
    } catch {
      setActionError("Couldn't update that item's quantity. Please try again.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleRemove(cartItemId) {
    setActionError(null);
    setBusyItemId(cartItemId);
    try {
      const res = await cartApi.removeItem(cartItemId);
      setCart(res.data.cart);
    } catch {
      setActionError("Couldn't remove that item. Please try again.");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleConfirmClear() {
    setConfirmingClear(false);
    setActionError(null);
    try {
      const res = await cartApi.clearCart();
      setCart(res.data.cart);
    } catch {
      setActionError("Couldn't clear your cart. Please try again.");
    }
  }

  if (status === 'loading') return <p className="text-gray-500">Loading your cart…</p>;
  if (status === 'error') {
    return <p className="text-red-600">Couldn't load your cart. Please try again.</p>;
  }

  const isEmpty = cart.items.length === 0;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Your cart</h1>

      {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

      {isEmpty && (
        <div className="rounded border border-gray-200 bg-white p-6 text-center">
          <p className="mb-3 text-gray-500">Your cart is empty.</p>
          <Link to="/restaurants" className="text-sm font-medium text-blue-600 hover:underline">
            Browse restaurants
          </Link>
        </div>
      )}

      {!isEmpty && (
        <>
          <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 p-4">
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
                    <p className="text-sm text-gray-500">{formatRupees(item.priceInRupees)} each</p>
                    {!item.isAvailable && (
                      <p className="text-sm text-red-600">
                        No longer available — remove before ordering.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busyItemId === item.id || item.quantity <= 1}
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className="h-7 w-7 rounded border border-gray-300 text-sm disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={busyItemId === item.id}
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="h-7 w-7 rounded border border-gray-300 text-sm disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <p className="w-20 text-right text-sm font-medium text-gray-900">
                    {formatRupees(paiseToRupeesLocal(item.lineTotalInPaise))}
                  </p>

                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => handleRemove(item.id)}
                    className="text-sm text-red-600 hover:underline disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between rounded border border-gray-200 bg-white p-4">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatRupees(cart.totalInRupees)}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="text-sm text-gray-500 hover:text-red-600 hover:underline"
            >
              Clear cart
            </button>
          </div>
        </>
      )}

      {confirmingClear && (
        <ConfirmModal
          title="Clear your cart?"
          message="This will remove every item currently in your cart."
          confirmLabel="Clear cart"
          cancelLabel="Cancel"
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </div>
  );
}

// lineTotalInPaise is already in paise from the API; this is display-only
// formatting, same reasoning as the module-level note above — not worth a
// shared money module for one extra division.
function paiseToRupeesLocal(paise) {
  return paise / 100;
}