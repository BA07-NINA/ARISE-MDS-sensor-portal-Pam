import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataFile } from "@/types";
import { Button } from "@/components/ui/button";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { TbArrowsUpDown } from "react-icons/tb";
import { Link } from "@tanstack/react-router";
import { Route } from ".";
import { useContext, useEffect, useState } from "react";
import AuthContext from "@/auth/AuthContext";
import DownloadButton from "@/components/DownloadButton/DownloadButton";
import AudioPlayer from "@/components/AudioPlayer/AudioPlayer";
import { bytesToMegabytes } from "@/utils/convertion";
import UploadButton from "@/components/UploadButton/UploadButton";
import { useQuery } from "@tanstack/react-query";
import DateForm from "@/components/AudioQuality/DateForm";

export default function DeviceDataFilesPage() {
  const { siteName } = Route.useParams();
  const authContext = useContext(AuthContext) as { authTokens: { access: string } | null };
  const { authTokens } = authContext || { authTokens: null };
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filteredDataFiles, setFilteredDataFiles] = useState<DataFile[]>([]);

  // Data fetching
  const { data: dataFiles, isLoading, error } = useQuery({
    queryKey: ['datafiles', siteName],
    queryFn: async () => {
      if (!authTokens?.access) return [];
      const response = await fetch(`/api/datafile/?deployment__site_name=${siteName}`, {
        headers: {
          'Authorization': `Bearer ${authTokens.access}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch data files');
      }
      const data = await response.json();
      return data.map((file: any) => ({
        id: file.id.toString(),
        deployment: file.deployment.toString(),
        fileName: file.file_name,
        fileFormat: file.file_format,
        fileSize: file.file_size,
        fileType: file.file_type,
        path: file.path,
        localPath: file.path,
        uploadDt: file.upload_dt,
        recordingDt: file.recording_datetime,
        config: file.config,
        sampleRate: file.sample_rate,
        fileLength: file.file_length,
        qualityScore: file.quality_score,
        qualityIssues: file.quality_issues || [],
        qualityCheckDt: file.quality_check_dt,
        qualityCheckStatus: file.quality_check_status,
        extraData: file.extra_data || null,
        thumbUrl: file.thumb_url,
        localStorage: false,
        archived: false,
        favourite: file.is_favourite
      }));
    },
    enabled: !!authTokens?.access
  });

  // Update filtered data when dataFiles changes
  useEffect(() => {
    if (dataFiles) {
      setFilteredDataFiles(dataFiles);
    }
  }, [dataFiles]);

  // Table columns definition
  const columns: ColumnDef<DataFile>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          ID
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          to="/deployments/$siteName/$dataFileId"
          params={{ siteName, dataFileId: row.original.id }}
          search={{ observationId: undefined }}
          className="text-blue-500 hover:underline"
        >
          {row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "fileName",
      header: "File Name",
      cell: ({ row }) => row.original.fileName,
    },
    {
      accessorKey: "sampleRate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          Sample Rate
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.sampleRate ? `${row.original.sampleRate} Hz` : "-",
    },
    {
      accessorKey: "fileLength",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          File Length
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        return row.original.fileLength ? `${row.original.fileLength}` : "-";
      },
    },
    {
      accessorKey: "fileSize",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          File Size (MB)
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const fileSize = row.original.fileSize;
        return `${bytesToMegabytes(fileSize)} MB`;
      },
    },
    {
      accessorKey: "fileFormat",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          File format
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.original.fileFormat,
    },
    {
      accessorKey: "recordingDt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          Recording Date
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.recordingDt).toLocaleString(),
    },
    {
      accessorKey: "qualityScore",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="w-full justify-start"
        >
          Quality Score
          <TbArrowsUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        row.original.qualityScore ? `${row.original.qualityScore}/100` : "-",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AudioPlayer
            fileId={row.original.id.toString()}
            fileFormat={row.original.fileFormat}
          />
          <DownloadButton
            fileId={row.original.id.toString()}
            fileFormat={row.original.fileFormat}
          />
        </div>
      ),
    },
  ];

  // Table state and instance for sorting and rendering
  const table = useReactTable({
    data: filteredDataFiles,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!authTokens) {
    return <p>Loading authentication...</p>;
  }

  const handleBulkQualityCheck = async () => {
    if (!authTokens?.access) return;

    try {
      // Get the deployment ID from the first data file
      const deploymentId = filteredDataFiles[0]?.deployment;
      if (!deploymentId) {
        alert("No deployment found for this device");
        return;
      }

      // Call the bulk quality check endpoint
      const response = await fetch(
        `/api/deployment/${deploymentId}/check_quality_bulk/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authTokens.access}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to start bulk quality check"
        );
      }

      const result = await response.json();
      alert(`Started quality check for ${result.total_files} files`);

      // Refetch data after a short delay to show updated status
      setTimeout(() => {}, 2000);
    } catch (error: unknown) {
      console.error("Error starting bulk quality check:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start bulk quality check. Please try again.";
      alert(errorMessage);
    }
  };

  // Function to handle data received from DateForm
  const handleDataFromDateForm = (newData: DataFile[]) => {
    setFilteredDataFiles(newData);
  };

  // Early returns after all hooks are called
  if (!authTokens) {
    return <p>Loading authentication...</p>;
  }

  if (isLoading) {
    return <p>Loading data files...</p>;
  }

  if (error) {
    return <p>Error: {(error as Error).message}</p>;
  }

  return (
    <div className="container mx-auto py-10">
      <DateForm
        filteredDatafiles={handleDataFromDateForm}
        site_name={siteName}
      />

      {!filteredDataFiles.length ? (
        <p>No data files found</p>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold pl-5">Data Files</h1>
            <UploadButton />
            <Button
              onClick={handleBulkQualityCheck}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Check Quality for All Audio Files
            </Button>
          </div>

          <div className="rounded-md border m-5 shadow-md">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="px-0 py-0">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
