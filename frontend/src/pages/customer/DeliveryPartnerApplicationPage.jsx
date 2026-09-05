// src/pages/customer/DeliveryPartnerApplicationPage.jsx
import { useEffect, useState } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import {
  getMyDeliveryPartnerApplication,
  submitDeliveryPartnerApplication,
} from '../../api/endpoints/deliveryPartnerApplicationsApi';

export default function DeliveryPartnerApplicationPage() {
  const [application, setApplication] = useState(undefined); // undefined = loading
  const [form, setForm] = useState({ vehicleType: '', licenseUrl: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyDeliveryPartnerApplication()
      .then((data) => {
        if (!cancelled) setApplication(data.application);
      })
      .catch(() => {
        if (!cancelled) setApplication(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    const errors = {};
    if (!form.vehicleType.trim()) errors.vehicleType = 'Vehicle type is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const data = await submitDeliveryPartnerApplication({
        vehicleType: form.vehicleType,
        licenseUrl: form.licenseUrl || undefined,
      });
      setApplication(data.application);
    } catch (err) {
      setServerError(
        err.response?.data?.error?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (application === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (application) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Your delivery partner application</h1>
            <StatusBadge status={application.status} />
          </div>
          <dl className="mt-4 space-y-2 text-sm text-gray-700">
            <div>
              <dt className="font-medium text-gray-500">Vehicle type</dt>
              <dd>{application.vehicleType}</dd>
            </div>
          </dl>

          {application.status === 'PENDING' && (
            <p className="mt-4 text-sm text-gray-600">
              Your application is waiting to be picked up for review.
            </p>
          )}
          {application.status === 'UNDER_REVIEW' && (
            <p className="mt-4 text-sm text-gray-600">
              An admin is currently reviewing your application.
            </p>
          )}
          {application.status === 'APPROVED' && (
            <p className="mt-4 text-sm text-green-700">
              You&apos;re approved as a delivery partner!
            </p>
          )}
          {application.status === 'REJECTED' && (
            <div className="mt-4 text-sm text-red-700">
              <p>Unfortunately, your application was not approved.</p>
              {application.reviewNote && (
                <p className="mt-1 italic text-gray-600">&ldquo;{application.reviewNote}&rdquo;</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-bold text-gray-900">Apply to become a delivery partner</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tell us about your vehicle. An admin will review your application.
        </p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <div>
            <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
              Vehicle type
            </label>
            <input
              id="vehicleType"
              name="vehicleType"
              type="text"
              placeholder="e.g. Bike, Scooter, Car"
              value={form.vehicleType}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
                fieldErrors.vehicleType
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {fieldErrors.vehicleType && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.vehicleType}</p>
            )}
          </div>

          <div>
            <label htmlFor="licenseUrl" className="block text-sm font-medium text-gray-700">
              License document URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="licenseUrl"
              name="licenseUrl"
              type="url"
              value={form.licenseUrl}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}