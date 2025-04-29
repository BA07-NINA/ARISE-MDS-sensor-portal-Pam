export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiDataFile {
  id: number;
  deployment: number;
  file_name: string;
  file_format: string;
  file_size: number;
  file_type: string;
  path: string;
  local_path: string;
  upload_dt: string;
  recording_dt: string;
  config: string | null;
  sample_rate: number | null;
  file_length: string | null;
  quality_score: number | null;
  quality_issues: string[];
  quality_check_dt: string | null;
  quality_check_status: string;
  extra_data: ApiExtraData | null;
  thumb_url?: string;
  local_storage?: boolean;
  archived?: boolean;
  is_favourite?: boolean;
}

export interface ApiExtraData {
  quality_metrics?: Record<string, unknown>;
  temporal_evolution?: Record<string, unknown>;
  observations?: string[];
  auto_detected_observations: number[];
}

export interface ApiDateRange {
  first_date: string;
  last_date: string;
} 