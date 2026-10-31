import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PageHeader, Card, Skeleton } from '@/components/ui';
import { useLookup } from '../hooks.js';

function ResultRow({ result }) {
  const { type, data } = result;
  if (type === 'customer') {
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-ink">{data.name}</p>
            <p className="text-small text-muted">{data.phone}</p>
            {data.email && <p className="text-small text-muted">{data.email}</p>}
          </div>
          <Link to={`/support/customers/${data.id}`} className="text-small text-sun hover:underline">View 360</Link>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          <span className="text-xs bg-leaf/10 text-leaf px-2 py-0.5 rounded">Customer</span>
          {data.city && <span className="text-xs text-muted">{data.city}</span>}
        </div>
      </Card>
    );
  }
  if (type === 'serial') {
    return (
      <Card className="p-4">
        <div>
          <p className="font-mono font-medium text-ink">{data.serialNumber}</p>
          <p className="text-small text-muted">{data.product?.name}</p>
        </div>
        <div className="mt-2">
          <span className="text-xs bg-muted/20 text-muted px-2 py-0.5 rounded">Serial unit</span>
          {data.status && <span className="text-xs text-muted ml-2">{data.status.replace(/_/g, ' ')}</span>}
        </div>
      </Card>
    );
  }
  if (type === 'project') {
    return (
      <Card className="p-4">
        <div>
          <p className="font-mono font-medium text-ink">{data.code}</p>
          <p className="text-small text-muted">{data.customer?.name}</p>
        </div>
        <div className="mt-2">
          <span className="text-xs bg-muted/20 text-muted px-2 py-0.5 rounded">Project</span>
          {data.status && <span className="text-xs text-muted ml-2">{data.status.replace(/_/g, ' ')}</span>}
        </div>
      </Card>
    );
  }
  return null;
}

export function LookupPage() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { data, isLoading } = useLookup(submitted);
  const results = Array.isArray(data) ? data : [];

  const handleSearch = (e) => {
    e.preventDefault();
    setSubmitted(q.trim());
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Support' }, { label: 'Lookup' }]}
        title="Customer lookup"
        subtitle="Search by customer name, phone number, project code, or serial number."
      />

      <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
        <input
          className="border border-line rounded-md px-3 py-2 text-body flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, phone, project code, serial number"
          autoFocus
        />
        <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-sun text-white text-body font-medium hover:bg-sun/90">
          <Search size={15} /> Search
        </button>
      </form>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {!isLoading && submitted && results.length === 0 && (
        <p className="text-muted text-body">No results found for "{submitted}".</p>
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-3 max-w-lg">
          {results.map((r, i) => <ResultRow key={i} result={r} />)}
        </div>
      )}
    </div>
  );
}
