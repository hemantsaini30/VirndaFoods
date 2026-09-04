// src/pages/Home.jsx
// Simple landing placeholder linking to each of the four experience routes,
// so the routing skeleton is easy to click through and verify manually.

import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">Food Delivery Platform</h1>
      <p className="text-gray-600">Phase 1 routing skeleton — pick an experience:</p>
      <ul className="space-y-2 list-disc list-inside text-blue-600">
        <li><Link to="/customer">Customer</Link></li>
        <li><Link to="/restaurant">Restaurant Dashboard</Link></li>
        <li><Link to="/driver">Driver Dashboard</Link></li>
        <li><Link to="/admin">Admin Dashboard</Link></li>
      </ul>
    </div>
  );
}
