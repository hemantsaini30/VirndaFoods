import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ordersApi from '../../api/endpoints/ordersApi';
import StatusBadge from '../../components/common/StatusBadge';

// Serves BOTH as the immediate post-checkout confirmation screen
// (CheckoutPage navigates here on success) and as the general order-detail
// view reached from OrderHistoryPage — same data, same layout either way,
// so there is no separate "confirmation" component. A future phase could
// add a one-time "Order placed!" banner driven by a router location.state
// flag if that distinction becomes worth making; not needed for this
// phase's scope.
export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [cancelStatus, setCancelStatus] = useState('idle'); // 'idle' | 'cancelling' | 'error'
  const [cancelError, setCancelError] = useState(null);

  function load() {
    setStatus('loading');
    return ordersApi
      .getOrder(id)
      .then((res) => {
        setOrder(res.data.order);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCancel() {
    setCancelError(null);
    setCancelStatus('cancelling');
    try {
      const res = await ordersApi.cancelOrder(id);
      setOrder(res.data.order);
      setCancelStatus('idle');
    } catch (err) {
      setCancelStatus('error');
      setCancelError(
        err?.response?.data?.error?.message || "Couldn't cancel this order. Please try again."
      );
    }
  }

  if (status === 'loading') return <p className="text-gray-500">Loading order…</p>;
  if (status === 'error') {
    return <p className="text-red-600">Couldn't load this order. It may not exist.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Order details</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-6 rounded border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm text-gray-500">Delivery address</p>
        <p className="mb-4 text-sm text-gray-900">{order.deliveryAddress}</p>

        <ul className="mb-3 divide-y divide-gray-200">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>₹{(item.priceAtPurchaseInRupees * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1 border-t border-gray-200 pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>₹{order.subtotalInRupees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Delivery fee</span>
            <span>₹{order.deliveryFeeInRupees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>₹{order.totalInRupees.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {cancelError && <p className="mb-3 text-sm text-red-600">{cancelError}</p>}

      {order.status === 'CREATED' && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelStatus === 'cancelling'}
          className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
        >
          {cancelStatus === 'cancelling' ? 'Cancelling…' : 'Cancel order'}
        </button>
      )}

      <div className="mt-4">
        <Link to="/orders" className="text-sm text-blue-600 hover:underline">
          Back to order history
        </Link>
      </div>
    </div>
  );
}