import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ordersApi from '../../api/endpoints/ordersApi';
import StatusBadge from '../../components/common/StatusBadge';

function formatRupees(amount) {
  return `₹${amount.toFixed(2)}`;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    ordersApi
      .listMyOrders()
      .then((res) => {
        setOrders(res.data.orders);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') return <p className="text-gray-500">Loading your orders…</p>;
  if (status === 'error') {
    return <p className="text-red-600">Couldn't load your orders. Please try again.</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Your orders</h1>

      {orders.length === 0 && (
        <div className="rounded border border-gray-200 bg-white p-6 text-center">
          <p className="mb-3 text-gray-500">You haven't placed any orders yet.</p>
          <Link to="/restaurants" className="text-sm font-medium text-blue-600 hover:underline">
            Browse restaurants
          </Link>
        </div>
      )}

      {orders.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-900">
                    {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {formatRupees(order.totalInRupees)}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}