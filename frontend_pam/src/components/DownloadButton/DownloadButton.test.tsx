import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DownloadButton from './DownloadButton';
import AuthContext from '@/auth/AuthContext';
import { vi, describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';

// Mock the AuthContext to provide a fake token for testing
const mockClick = vi.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:http://localhost/blobid'),
    revokeObjectURL: vi.fn(),
  },
});

// Override document.createElement to return our custom anchor with a mock click handler
const originalCreateElement = document.createElement;
const anchor = originalCreateElement.call(document, 'a'); 
anchor.click = mockClick; 

document.createElement = vi.fn((element) => {
  if (element === 'a') return anchor;
  return originalCreateElement.call(document, element);
});

// Stub fetch to be used by the download logic
global.fetch = vi.fn();

// Mock authentication context
const mockAuthContext = {
  authTokens: {
    access: 'fake-token',
  },
};

//Test suite for the DownloadButton component
describe('DownloadButton', () => {
  // Test that the button renders
  it('renders the download button', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DownloadButton deviceId="123" fileId="456" fileFormat=".mp3" />
      </AuthContext.Provider>
    );

    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
  });

  // Test a successful download by mocking fetch and checking that the anchor click is triggered
  it('downloads a file successfully', async () => {
    const mockBlob = new Blob(['test content'], { type: 'audio/mp3' });

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob,
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DownloadButton deviceId="123" fileId="456" fileFormat=".mp3" />
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Download/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/datafile/456/download/', {
        headers: { Authorization: 'Bearer fake-token' },
      });
    });
      expect(anchor.click).toHaveBeenCalled(); 
    });
  });

  // Test handling of a download error by ensuring an alert is shown
  it('handles download error gracefully', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'File not found' }),
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <DownloadButton deviceId="999" fileId="888" fileFormat=".wav" />
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Download/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to download file. Please check the console for details.'
      );
    });
  });
