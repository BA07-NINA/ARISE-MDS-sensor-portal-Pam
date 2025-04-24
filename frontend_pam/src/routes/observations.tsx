import { createFileRoute } from '@tanstack/react-router';
import AllObservationsList from '@/components/Observations/AllObservationsList';

export const Route = createFileRoute('/observations')({
  component: ObservationsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return { 
      dataFileId: typeof search.dataFileId === 'string' ? search.dataFileId : undefined,
      deviceId: typeof search.deviceId === 'string' ? search.deviceId : undefined
    };
  }
});

function ObservationsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">All Observations</h1>
      <AllObservationsList />
    </div>
  );
} 