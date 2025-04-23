import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Route } from '@/routes/deployments/$siteName';
import { useQueryClient } from '@tanstack/react-query';

interface FileWithId {
  file: File;
  recordingDate: Date | null;
}

export default function UploadButton() {
  const { siteName } = Route.useParams();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        file,
        recordingDate: null
      }));
      setFiles(newFiles);
      setCurrentFileIndex(0);
      setError(null);
      setIsDateDialogOpen(true);
    }
  };

  const handleDateConfirm = () => {
    const date = new Date(selectedDate);
    if (!isNaN(date.getTime())) {
      const updatedFiles = [...files];
      updatedFiles[currentFileIndex] = {
        ...updatedFiles[currentFileIndex],
        recordingDate: date
      };
      setFiles(updatedFiles);
      setIsDateDialogOpen(false);

      if (currentFileIndex < files.length - 1) {
        setCurrentFileIndex(currentFileIndex + 1);
        setIsDateDialogOpen(true);
      } else {
        handleUpload();
      }
    }
  };

  const handleUpload = async () => {
    if (!siteName) {
      setError('No site name found in URL');
      return;
    }

    const formData = new FormData();
    const audioFiles = files.map(fileWithId => ({
      file_name: fileWithId.file.name,
      fileSize: fileWithId.file.size,
      recording_dt: fileWithId.recordingDate?.toISOString(),
      path: '/usr/src/proj_tabmon_NINA',
      local_path: '',
      file_format: fileWithId.file.name.split('.').pop()
    }));

    formData.append('audioFiles', JSON.stringify(audioFiles));
    formData.append('site_name', siteName);
    files.forEach(fileWithId => {
      formData.append('files', fileWithId.file);
    });

    try {
      const authTokens = JSON.parse(sessionStorage.getItem("authTokens") || "{}");
      const response = await fetch('/api/datafile/register_audio_files/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authTokens.access}`
        },
        body: formData,
      });

      if (response.ok) {
        setFiles([]);
        setCurrentFileIndex(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        await queryClient.invalidateQueries({ queryKey: ['datafiles', siteName] });
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed');
      }
    } catch (error) {
      setError('Error uploading files');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <Button onClick={() => fileInputRef.current?.click()}>
          Upload Files
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
        <div className="text-red-500">{error}</div>
      )}

      {isDateDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Select Recording Date for {files[currentFileIndex]?.file.name}</h2>
            <Input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsDateDialogOpen(false)} variant="outline">Cancel</Button>
              <Button onClick={handleDateConfirm}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 