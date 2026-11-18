'use client';

import { useState } from 'react';
import { api, ApiError } from '../lib/api';

/** Service discovery input. Results are returned by the API; this component
 * does not create an order or claim a booking has been made. */
export function RequestInput() {
  const [value, setValue] = useState('');
  const [results, setResults] = useState<{ definitionId: string; domain: string; category: string; capabilities: string[]; type: string; configuration: Record<string, unknown> }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    const query = value.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      setResults(await api.searchServices(query));
    } catch (e) {
      setError(e instanceof ApiError ? `Search failed (${e.status})` : 'Could not reach the DEPUKO API');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Find a service">
      <form onSubmit={e => { e.preventDefault(); void search(); }}>
        <label htmlFor="depuko-request">What do you need done?</label>
        <textarea
          id="depuko-request"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Describe the service you need..."
          rows={3}
        />
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? 'Searching…' : 'Find services'}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {results && (results.length === 0
        ? <p>No published services matched your description.</p>
        : <ul>{results.map(item => <li key={item.definitionId}><strong>{item.category}</strong> — {item.capabilities.join(' · ')}</li>)}</ul>)}
      <p>Search finds published services only; it does not submit an order or guarantee availability.</p>
    </section>
  );
}
