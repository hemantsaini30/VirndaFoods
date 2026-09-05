// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  listRestaurantApplications,
  updateRestaurantApplicationStatus,
} from '../../api/endpoints/restaurantApplicationsApi';
import {
  listDeliveryPartnerApplications,
  updateDeliveryPartnerApplicationStatus,
} from '../../api/endpoints/deliveryPartnerApplicationsApi';

const ACTIVE_STATUSES = ['PENDING', 'UNDER_REVIEW'];

function ApplicationsTable({ applications, extraColumns, onStartReview, onApprove, onReject }) {
  const [rejectTarget, setRejectTarget] = useState(null);

  if (applications === undefined) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (applications.length === 0) {
    return <p className="text-sm text-gray-500">No pending or under-review applications.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {extraColumns.map((col) => (
                <th key={col.key} className="px-4 py-2 text-left font-medium text-gray-500">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {applications.map((app) => (
              <tr key={app.id}>
                {extraColumns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-gray-700">
                    {col.render(app)}
                  </td>
                ))}
                <td className="px-4 py-2">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {app.status === 'PENDING' && (
                      <button
                        onClick={() => onStartReview(app)}
                        className="rounded-md bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Move to review
                      </button>
                    )}
                    {app.status === 'UNDER_REVIEW' && (
                      <button
                        onClick={() => onApprove(app)}
                        className="rounded-md bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => setRejectTarget(app)}
                      className="rounded-md bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rejectTarget && (
        <ConfirmModal
          title="Reject this application?"
          message="This cannot be undone. You can optionally leave a note explaining why."
          confirmLabel="Reject"
          requireNote
          onCancel={() => setRejectTarget(null)}
          onConfirm={(note) => {
            onReject(rejectTarget, note);
            setRejectTarget(null);
          }}
        />
      )}
    </>
  );
}

export default function AdminDashboard() {
  const [restaurantApps, setRestaurantApps] = useState(undefined);
  const [driverApps, setDriverApps] = useState(undefined);
  const [activeTab, setActiveTab] = useState('restaurant');
  const [error, setError] = useState('');

  const loadRestaurantApps = useCallback(() => {
    listRestaurantApplications()
      .then((data) =>
        setRestaurantApps(data.applications.filter((a) => ACTIVE_STATUSES.includes(a.status)))
      )
      .catch(() => setError('Failed to load restaurant applications.'));
  }, []);

  const loadDriverApps = useCallback(() => {
    listDeliveryPartnerApplications()
      .then((data) =>
        setDriverApps(data.applications.filter((a) => ACTIVE_STATUSES.includes(a.status)))
      )
      .catch(() => setError('Failed to load delivery partner applications.'));
  }, []);

  useEffect(() => {
    loadRestaurantApps();
    loadDriverApps();
  }, [loadRestaurantApps, loadDriverApps]);

  async function handleRestaurantAction(app, status, reviewNote) {
    setError('');
    try {
      await updateRestaurantApplicationStatus(app.id, { status, reviewNote });
      loadRestaurantApps();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Action failed.');
    }
  }

  async function handleDriverAction(app, status, reviewNote) {
    setError('');
    try {
      await updateDeliveryPartnerApplicationStatus(app.id, { status, reviewNote });
      loadDriverApps();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Action failed.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin — Applications</h1>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('restaurant')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'restaurant'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Restaurant applications
        </button>
        <button
          onClick={() => setActiveTab('driver')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'driver'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Delivery partner applications
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'restaurant' && (
          <ApplicationsTable
            applications={restaurantApps}
            extraColumns={[
              { key: 'name', label: 'Restaurant', render: (a) => a.name },
              { key: 'city', label: 'City', render: (a) => a.city },
            ]}
            onStartReview={(app) => handleRestaurantAction(app, 'UNDER_REVIEW')}
            onApprove={(app) => handleRestaurantAction(app, 'APPROVED')}
            onReject={(app, note) => handleRestaurantAction(app, 'REJECTED', note)}
          />
        )}
        {activeTab === 'driver' && (
          <ApplicationsTable
            applications={driverApps}
            extraColumns={[{ key: 'vehicleType', label: 'Vehicle type', render: (a) => a.vehicleType }]}
            onStartReview={(app) => handleDriverAction(app, 'UNDER_REVIEW')}
            onApprove={(app) => handleDriverAction(app, 'APPROVED')}
            onReject={(app, note) => handleDriverAction(app, 'REJECTED', note)}
          />
        )}
      </div>
    </div>
  );
}