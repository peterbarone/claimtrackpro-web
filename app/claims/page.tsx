import React from 'react';

export default function ClaimsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Claims</h1>
      <p className="mt-4">This page displays claims. The data is fetched from the server API at <code>/api/claims</code>.</p>
      <p className="mt-2 text-sm text-gray-600">(Switch to the table view or integrate client-side fetching as needed.)</p>
    </div>
  );
}
