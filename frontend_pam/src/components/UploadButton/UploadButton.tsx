import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Route } from '@/routes/deployments/$siteName';
import { useQueryClient } from '@tanstack/react-query';

interface FileWithId {
  file: File;
  recordingDate: Date | null;
}

interface UploadResult {
  created_files: string[];
  errors: Array<{
    file: string;
    error: string;
  }>;
}

export default function UploadButton() {
  const { siteName } = Route.useParams();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (showResult && !uploadResult?.errors.length) {
      const timer = setTimeout(() => {
        setShowResult(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showResult, uploadResult]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        file,
        recordingDate: null
      }));
      setFiles(newFiles);
      setCurrentFileIndex(0);
      setError(null);
      setShowResult(false);
      setUploadResult(null);
      setIsDateDialogOpen(true);
    }
  };

  const handleDateConfirm = () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
  
    const date = new Date(selectedDate);
    if (isNaN(date.getTime())) {
      setError('Please select a valid date');
      return;
    }
  
    // Update files directly and proceed safely
    const updatedFiles = [...files];
    updatedFiles[currentFileIndex] = {
      ...updatedFiles[currentFileIndex],
      recordingDate: date,
    };
  
    if (currentFileIndex < files.length - 1) {
      setFiles(updatedFiles);
      setCurrentFileIndex(currentFileIndex + 1);
      setSelectedDate('');
      setIsDateDialogOpen(true);
    } else {
      // Only update state and call upload with the latest data
      setFiles(updatedFiles);
      setIsDateDialogOpen(false);
  
      // Use a microtask to ensure state updates flush
      setTimeout(() => handleUpload(updatedFiles), 0);
    }
  };

  const handleDateCancel = () => {
    setIsDateDialogOpen(false);
    setFiles([]);
    setCurrentFileIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (uploadFiles: FileWithId[] = files) => {
    if (!siteName) {
      setError('No site name found in URL');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setShowResult(false);
  
    const formData = new FormData();
    const audioFiles = uploadFiles.map(fileWithId => ({
      file_name: fileWithId.file.name,
      fileSize: fileWithId.file.size,
      recording_dt: fileWithId.recordingDate ? fileWithId.recordingDate.toISOString().split('T')[0] : null,
      path: '/usr/src/proj_tabmon_NINA',
      local_path: '',
      file_format: fileWithId.file.name.split('.').pop(),
    }));
  
    formData.append('audioFiles', JSON.stringify(audioFiles));
    formData.append('site_name', siteName);
  
    uploadFiles.forEach(fileWithId => {
      formData.append('files', fileWithId.file);
    });
  
    try {
      const authTokens = JSON.parse(sessionStorage.getItem("authTokens") || "{}");
      const response = await fetch('/api/datafile/register_audio_files/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authTokens.access}`,
        },
        body: formData,
      });
  
      const data = await response.json();
      
      if (response.ok) {
        setUploadResult(data);
        setShowResult(true);
        setFiles([]);
        setCurrentFileIndex(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await queryClient.invalidateQueries({ queryKey: ['datafiles', siteName] });
      } else {
        setError(data.detail || 'Upload failed');
      }
    } catch (error) {
      setError('Error uploading files');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? 'Uploading...' : 'Upload Files'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept=".mp3,.wav"
        />
      </div>

      {error && (
        <div className="text-red-500 p-3 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      {showResult && uploadResult && (
        <div className={`p-4 rounded-md ${uploadResult.errors.length ? 'bg-yellow-50 border border-yellow-300' : 'bg-green-50 border border-green-300'}`}>
          {uploadResult.created_files.length > 0 && (
            <div className="mb-2 text-green-700">
              <p className="font-medium">Successfully uploaded {uploadResult.created_files.length} files:</p>
              <ul className="list-disc pl-5 mt-1 text-sm">
                {uploadResult.created_files.map((file, index) => (
                  <li key={index}>{file}</li>
                ))}
              </ul>
            </div>
          )}
          
          {uploadResult.errors.length > 0 && (
            <div className="text-red-700">
              <p className="font-medium">Failed to upload {uploadResult.errors.length} files:</p>
              <ul className="list-disc pl-5 mt-1 text-sm">
                {uploadResult.errors.map((error, index) => (
                  <li key={index}>
                    {error.file}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isDateDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Select Recording Date for {files[currentFileIndex]?.file.name}</h2>
            <p className="text-sm text-gray-500 mb-2">File {currentFileIndex + 1} of {files.length}</p>
            <Input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={handleDateCancel} variant="outline">Cancel</Button>
              <Button onClick={handleDateConfirm}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 