import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Route } from '@/routes/deployments/$siteName';

interface FileWithId {
  file: File;
  id: number | null;
  recordingDate: Date | null;
}

interface ExistingFile {
  id: number;
  file_name: string;
  recording_dt: string;
}

export default function UploadButton() {
  const { siteName } = Route.useParams();
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const [isInitialDialogOpen, setIsInitialDialogOpen] = useState<boolean>(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState<boolean>(false);
  const [isIdDialogOpen, setIsIdDialogOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map(file => ({
        file,
        id: null,
        recordingDate: null
      }));
      setFiles(newFiles);
      setCurrentFileIndex(0);
      setError(null);
      setIsInitialDialogOpen(true);
    }
  };

  const handleNewFile = () => {
    setIsInitialDialogOpen(false);
    setIsDateDialogOpen(true);
  };

  const handleUpdateFile = async () => {
    setIsInitialDialogOpen(false);
    try {
      const authTokens = JSON.parse(sessionStorage.getItem("authTokens") || "{}");
      const response = await fetch('/api/datafile/', {
        headers: {
          'Authorization': `Bearer ${authTokens.access}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExistingFiles(data.results || []);
        setIsIdDialogOpen(true);
      } else {
        setError('Failed to fetch existing files');
      }
    } catch (error) {
      console.error('Error fetching existing files:', error);
      setError('Error fetching existing files');
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
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
      handleNextFile();
    }
  };

  const handleUseExistingFile = (fileId: number) => {
    const updatedFiles = [...files];
    updatedFiles[currentFileIndex] = {
      ...updatedFiles[currentFileIndex],
      id: fileId
    };
    setFiles(updatedFiles);
    setIsIdDialogOpen(false);
    handleNextFile();
  };

  const handleNextFile = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
      setIsInitialDialogOpen(true);
    } else {
      handleUpload();
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
        const data = await response.json();
        console.log('Upload successful:', data);
        setFiles([]);
        setCurrentFileIndex(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Upload failed');
      }
    } catch (error) {
      setError('Error uploading files');
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="file"
        onChange={handleFileChange}
        multiple
        accept=".mp3,.wav"
        ref={fileInputRef}
        className="hidden"
        id="file-upload"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
      >
        Select Audio Files
      </Button>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {isInitialDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">
              Are you registering a new file or updating an old one?
            </h2>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleNewFile}>New File</Button>
              <Button onClick={handleUpdateFile}>Update Existing</Button>
            </div>
          </div>
        </div>
      )}

      {isDateDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Select Recording Date</h2>
            <div className="space-y-4">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="w-full"
              />
              <div className="flex justify-end">
                <Button onClick={handleDateConfirm}>Confirm Date</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isIdDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Select Existing File</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                {existingFiles.map(file => (
                  <div key={file.id} className="p-2 border rounded">
                    <p>ID: {file.id}</p>
                    <p>Recording Date: {new Date(file.recording_dt).toLocaleDateString()}</p>
                    <Button
                      onClick={() => handleUseExistingFile(file.id)}
                      className="mt-2"
                    >
                      Use This File
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 