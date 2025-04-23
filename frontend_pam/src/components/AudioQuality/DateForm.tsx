import { useContext, useEffect, useState } from "react";
import { DatePicker } from "../ui/DatePicker";
import { useQuery } from "@tanstack/react-query";
import AuthContext from "@/auth/AuthContext";
import { getData } from "@/utils/FetchFunctions";
import { DataFile } from "@/types";

interface DateRangeResponse {
  first_date: string;
  last_date: string;
}

interface DatafileProps {
  filteredDatafiles: (data: DataFile[]) => void;
  site_name: string;
}

const DateForm: React.FC<DatafileProps> = ({
  filteredDatafiles,
  site_name,
}) => {
  const authContext = useContext(AuthContext);
  const { authTokens } = authContext || { authTokens: null };
  
  const { data: dateRange } = useQuery({
    queryKey: ["dateRange", site_name],
    queryFn: async () => {
      if (!authTokens?.access) {
        throw new Error('No access token available');
      }
      const response = await getData<DateRangeResponse>(
        `datafile/date_range?site_name=${site_name}`,
        authTokens.access
      );
      return response as unknown as DateRangeResponse;
    },
    enabled: !!authTokens?.access,
  });

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (dateRange?.first_date && dateRange?.last_date) {
      setStartDate(new Date(dateRange.first_date));
      setEndDate(new Date(dateRange.last_date));
    }
  }, [dateRange]);

  const { data, error, isLoading, isError } = useQuery<DataFile[]>({
    queryKey: ["datafile", startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate || !authTokens?.access) return [];
      
      // Format dates with leading zeros
      const formattedStartDate = `${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}-${startDate.getFullYear()}`;
      const formattedEndDate = `${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}-${endDate.getFullYear()}`;

      const response = await getData<any[]>(
        `datafile/filter_by_date?start_date=${formattedStartDate}&end_date=${formattedEndDate}&site_name=${site_name}`,
        authTokens.access
      );

      // Transform the response data to match the DataFile type
      const files = Array.isArray(response) ? response : [];
      return files.map((file: any) => ({
        id: file.id.toString(),
        deployment: file.deployment.toString(),
        fileName: file.file_name,
        fileFormat: file.file_format,
        fileSize: file.file_size || 0,
        fileType: file.file_type,
        path: file.path,
        localPath: file.local_path,
        uploadDt: file.upload_dt,
        recordingDt: file.recording_datetime,
        config: file.config ? JSON.parse(file.config) : null,
        sampleRate: file.sample_rate || null,
        fileLength: file.file_length || null,
        qualityScore: file.quality_score,
        qualityIssues: file.quality_issues || [],
        qualityCheckDt: file.quality_check_dt,
        qualityCheckStatus: file.quality_check_status,
        extraData: file.extra_data || null,
        thumbUrl: file.thumb_url || null,
        localStorage: false,
        archived: false,
        favourite: file.is_favourite || false
      }));
    },
    enabled: !!startDate && !!endDate && !!authTokens?.access,
  });

  useEffect(() => {
    if (data) {
      filteredDatafiles(data);
    }
  }, [data, filteredDatafiles]);

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {(error as Error).message}</div>;

  return (
    <div className="flex space-x-4 items-center pl-5">
      <DatePicker
        value={startDate}
        onChange={setStartDate}
        label="Pick start date"
      />
      <DatePicker
        value={endDate}
        onChange={setEndDate}
        label="Pick end date"
      />
    </div>
  );
};

export default DateForm;
