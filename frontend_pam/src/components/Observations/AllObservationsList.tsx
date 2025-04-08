import { useState, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getData } from "@/utils/FetchFunctions";
import AuthContext from "@/auth/AuthContext";
import ObservationEditModal from './ObservationEditModal';
import { formatTime } from "@/utils/timeFormat";
import { Link, useNavigate } from "@tanstack/react-router";
import { LuExternalLink } from "react-icons/lu";
import { type Observation } from './types';

export default function AllObservationsList() {
  const { authTokens } = useContext(AuthContext) as any;
  const navigate = useNavigate();
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taxonCache, setTaxonCache] = useState<Record<number, { id: number; species_name: string; species_common_name: string }>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 100; // Fetch 100 observations per page
  const queryClient = useQueryClient();

  // Query for all observations with pagination
  const { data: observations, isLoading } = useQuery({
    queryKey: ['all-observations', currentPage],
    queryFn: async () => {
      if (!authTokens?.access) return { results: [], count: 0 };
      try {
        // Fetch observations with expanded data_files information
        const data = await getData(`observation/?page=${currentPage}&page_size=${pageSize}&expand=data_files.deployment.device&include_deployment=true`, authTokens.access);
        
        const observations = data.results || [];
        const totalCount = data.count || 0;
        setTotalPages(Math.ceil(totalCount / pageSize));
        
        // Process observations to extract taxon data and fix device IDs
        const processedObservations = observations.map((obs: any) => {
          // Process the data_files to ensure device.id is set from deployment name
          const processedDataFiles = obs.data_files?.map((df: any) => ({
            ...df,
            deployment: df.deployment ? {
              ...df.deployment,
              device: {
                ...df.deployment.device,
                // Use the first part of deployment name as device ID
                id: df.deployment.name?.split('-')[0] || 'unknown'
              }
            } : undefined
          }));

          if (obs.taxon && typeof obs.taxon === 'object') {
            const taxonId = obs.taxon.id;
            if (taxonId) {
              setTaxonCache(prev => ({ ...prev, [taxonId]: obs.taxon }));
            }
            return {
              ...obs,
              id: Number(obs.id),
              obs_dt: obs.obs_dt || new Date().toISOString(),
              needs_review: obs.needs_review,
              taxon: obs.taxon,
              data_files: processedDataFiles
            };
          }
          
          const taxonId = typeof obs.taxon === 'number' ? obs.taxon : obs.taxon?.id;
          if (taxonId && taxonCache[taxonId]) {
            return {
              ...obs,
              id: Number(obs.id),
              obs_dt: obs.obs_dt || new Date().toISOString(),
              needs_review: obs.needs_review,
              taxon: taxonCache[taxonId],
              data_files: processedDataFiles
            };
          }
          
          return {
            ...obs,
            id: Number(obs.id),
            obs_dt: obs.obs_dt || new Date().toISOString(),
            needs_review: obs.needs_review,
            taxon: { id: taxonId || 0, species_name: 'Unknown', species_common_name: 'Unknown' },
            data_files: processedDataFiles
          };
        });

        return {
          results: processedObservations,
          count: totalCount
        };
      } catch (error) {
        console.error('Failed to fetch observations:', error);
        throw error;
      }
    },
    enabled: !!authTokens?.access,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const handleEditClick = (observation: Observation) => {
    setSelectedObservation(observation);
    setIsEditModalOpen(true);
  };

  const handleSaveObservation = async (updatedObservation: Observation) => {
    try {
      setTaxonCache(prev => ({
        ...prev,
        [updatedObservation.taxon.id]: {
          id: updatedObservation.taxon.id,
          species_name: updatedObservation.taxon.species_name,
          species_common_name: updatedObservation.taxon.species_common_name
        }
      }));

      setIsEditModalOpen(false);

      // Update the query cache
      queryClient.setQueryData(['all-observations', currentPage], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          results: oldData.results.map((obs: any) => 
            obs.id === updatedObservation.id ? {
              ...updatedObservation,
              taxon: {
                id: updatedObservation.taxon.id,
                species_name: updatedObservation.taxon.species_name,
                species_common_name: updatedObservation.taxon.species_common_name
              }
            } : obs
          )
        };
      });
    } catch (error) {
      console.error('Error saving observation:', error);
      alert('Failed to save observation. Please try again.');
    }
  };

  const handleDeleteObservation = async (id: number) => {
    if (!authTokens?.access) return;
    
    if (!window.confirm('Are you sure you want to delete this observation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/observation/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authTokens.access}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete observation');
      }

      // Update the query cache
      queryClient.setQueryData(['all-observations', currentPage], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          results: oldData.results.filter((obs: any) => obs.id !== id)
        };
      });
    } catch (error) {
      console.error('Error deleting observation:', error);
      alert('Failed to delete observation. Please try again.');
    }
  };

  const handleDownloadObservations = async () => {
    if (!authTokens?.access) return;

    try {
      // Fetch all observations for download
      const allObservations = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const data = await getData(`observation/?page=${page}&page_size=1000`, authTokens.access);
        allObservations.push(...(data.results || []));
        hasMore = data.next !== null;
        page++;
      }

      // Create CSV header
      const headers = [
        'ID',
        'Species Name',
        'Common Name',
        'Source',
        'Date',
        'Start Time',
        'End Time',
        'Duration',
        'Average Amplitude',
        'Auto Detected',
        'Needs Review',
        'File Names'
      ];

      // Create CSV rows
      const rows = allObservations.map(obs => [
        obs.id,
        obs.taxon.species_name,
        obs.taxon.species_common_name,
        obs.source,
        obs.obs_dt,
        obs.extra_data.start_time,
        obs.extra_data.end_time,
        obs.extra_data.duration,
        obs.extra_data.avg_amplitude,
        obs.extra_data.auto_detected,
        obs.needs_review,
        (obs.data_files || []).map((df: any) => df.file_name).join('; ')
      ]);

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `all_observations_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading observations:', error);
      alert('Failed to download observations. Please try again.');
    }
  };

  const handleNavigateToFile = (observation: Observation) => {
    if (observation.data_files?.length > 0 && observation.data_files[0].deployment?.device?.id) {
      const deviceId = observation.data_files[0].deployment.device.id;
      const dataFileId = observation.data_files[0].id.toString();
      navigate({ 
        to: '/devices/$deviceId/$dataFileId',
        params: { deviceId, dataFileId },
        search: { observationId: observation.id.toString() }
      });
    }
  };

  if (!authTokens?.access) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        Please log in to view observations
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">All Observations</h2>
          {observations && (
            <p className="text-gray-600">
              Showing {observations.results.length} of {observations.count} observations
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadObservations}>Download All</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading observations...</p>
        </div>
      ) : observations?.results.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No observations found</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Common Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Review Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observations?.results.map((observation: Observation) => (
                <TableRow 
                  key={observation.id}
                  className="hover:bg-gray-50"
                >
                  <TableCell>{new Date(observation.obs_dt).toLocaleString()}</TableCell>
                  <TableCell>{observation.taxon.species_name}</TableCell>
                  <TableCell>{observation.taxon.species_common_name}</TableCell>
                  <TableCell>{observation.source}</TableCell>
                  <TableCell>{observation.needs_review ? "Needs Review" : "Reviewed"}</TableCell>
                  <TableCell>
                    {observation.extra_data?.duration ? 
                      formatTime(observation.extra_data.duration) : 
                      "N/A"}
                  </TableCell>
                  <TableCell>
                    {observation.data_files?.map(df => 
                      df.deployment?.device?.name || "Unknown"
                    ).filter((value, index, self) => self.indexOf(value) === index).join(', ')}
                  </TableCell>
                  <TableCell>
                    {observation.data_files?.map(df => df.file_name).join(', ')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(() => {
                        const firstFile = observation.data_files?.[0];
                        if (firstFile?.deployment?.device?.id && firstFile.id) {
                          return (
                            <Link
                              to="/devices/$deviceId/$dataFileId"
                              params={{
                                deviceId: firstFile.deployment.device.id,
                                dataFileId: firstFile.id.toString()
                              }}
                              search={{
                                observationId: observation.id.toString()
                              }}
                              className="no-underline"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <LuExternalLink className="mr-1 h-4 w-4" />
                                View Audio
                              </Button>
                            </Link>
                          );
                        }
                        return null;
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(observation)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteObservation(observation.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {observation.data_files?.[0]?.deployment?.device?.id && (
                      <LuExternalLink className="inline-block" title="Open audio file" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-center gap-2 mt-4">
            <Button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="py-2 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {selectedObservation && (
        <ObservationEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          observation={selectedObservation}
          onSave={handleSaveObservation}
        />
      )}
    </div>
  );
} 