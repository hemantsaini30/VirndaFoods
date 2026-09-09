import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ordersApi from '../../api/endpoints/ordersApi';
import cartApi from '../../api/endpoints/cartApi';

// The idempotency key is generated ONCE, when this component first
// mounts, via useState's lazy initializer form (the initializer function
// only ever runs on the very first render, not on every re-render). This
// exact same key is reused for every submit attempt of THIS checkout
// session, including a manual retry after a transient network error —
// regenerating it on retry would defeat the entire purpose of idempotency
// (the server would see it as a brand-new request and could create a
// duplicate order if the first attempt had actually succeeded
// server-side but the response was lost in transit). A genuinely NEW
// checkout attempt (e.g. the customer navigates away and back, or fixes
// their cart and returns) gets a fresh key because this component
// unmounts and remounts, which reruns the lazy initializer.
//
// Uses the native crypto.randomUUID() (supported in all evergreen
// browsers) rather than adding the `uuid` npm package as a new dependency
// for a single UUID call — no new frontend dependency introduced for this
// phase.
export default function CheckoutPage() {
  const navigate = useNavigate();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cart, setCart] = useState(null);
  const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [submitStatus, setSubmitStatus] = useState('idle'); // 'idle' | 'submitting' | 'error'
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    cartApi
      .getCart()
      .then((res) => {
        setCart(res.data.cart);
        setLoadStatus('success');
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitStatus('submitting');
    try {
      const res = await ordersApi.createOrder(deliveryAddress, idempotencyKey);
      navigate(`/orders/${res.data.order.id}`, { replace: true });
    } catch (err) {
      setSubmitStatus('error');
      const code = err?.response?.data?.error?.code;
      const message = err?.response?.data?.error?.message;

      if (code === 'CONFLICT' || code === 'CART_CHANGED_DURING_ORDER') {
        // Surfaces the backend's specific, item-naming message directly
        // (e.g. "The following item(s) are no longer available...") —
        // per the phase brief's instruction to show a clear, specific
        // message rather than a generic error, and to let the customer
        // return to the cart to fix it.
        setSubmitError(message || 'Something in your cart has changed. Please review your cart.');
      } else {
        setSubmitError("Couldn't place your order. Please try again.");
      }
    }
  }

  if (loadStatus === 'loading') return <p className="text-gray-500">Loading checkout…</p>;
  if (loadStatus === 'error') {
    return <p className="text-red-600">Couldn't load your cart. Please try again.</p>;
  }
  if (cart.items.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-white p-6 text-center">
        <p className="mb-3 text-gray-500">Your cart is empty.</p>
        <Link to="/restaurants" className="text-sm font-medium text-blue-600 hover:underline">
          Browse restaurants
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Checkout</h1>

      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-gray-900">Order summary</h2>
        <ul className="mb-3 divide-y divide-gray-200">
          {cart.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>₹{(item.lineTotalInPaise / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900">
          <span>Total (incl. delivery)</span>
          <span>₹{cart.totalInRupees.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded border border-gray-200 bg-white p-4">
        <label htmlFor="deliveryAddress" className="mb-1 block text-sm font-medium text-gray-700">
          Delivery address
        </label>
        <textarea
          id="deliveryAddress"
          required
          minLength={1}
          maxLength={500}
          rows={3}
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          className="mb-4 w-full rounded border border-gray-300 p-2 text-sm"
          placeholder="House no., street, city, pincode"
        />

        {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitStatus === 'submitting'}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitStatus === 'submitting' ? 'Placing order…' : 'Place order'}
          </button>
          <Link to="/cart" className="text-sm text-gray-500 hover:underline">
            Back to cart
          </Link>
        </div>
      </form>
    </div>
  );
}