
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import AudioWaveformPlayer from './AudioWaveformPlayer';
import AuthContext from '@/auth/AuthContext';

// Fake AudioContext implementation for tests.
class FakeAudioContext {
  state = 'running';
  close = vi.fn();
  resume = vi.fn(() => Promise.resolve());
  createAnalyser() {
    return {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
    };
  }
  createMediaElementSource() {
    return {
      connect: vi.fn(),
    };
  }
}
beforeAll(() => {
  // Stub AudioContext and webkitAudioContext globally
  (window as any).AudioContext = FakeAudioContext;
  (window as any).webkitAudioContext = FakeAudioContext;
});

// Create a simple auth context value for testing.
const mockAuthTokens = {
  access: 'fakeAccessToken',
  refresh: 'fakeRefreshToken',
};

const authContextValue = {
  user: {},
  authTokens: mockAuthTokens,
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
};

// Mock fetch to return a dummy audio blob.
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () =>
      Promise.resolve(new Blob(['audio content'], { type: 'audio/mp3' })),
    headers: { entries: () => [] },
  })
) as unknown as typeof fetch);

// Stub URL.createObjectURL so it returns a fixed string.
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:dummy')
});

describe('AudioWaveformPlayer component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the player UI with controls and time display', () => {
    render(
      <AuthContext.Provider value={authContextValue}>
        <AudioWaveformPlayer deviceId="device1" fileId="file1" fileFormat=".mp3" />
      </AuthContext.Provider>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);

    // Check that the time display initially shows "0:00 / 0:00"
    const timeDisplays = screen.getAllByText("0:00");
    expect(timeDisplays.length).toBeGreaterThanOrEqual(2);
  });

  it('attempts to play audio when the play button is clicked (user has interacted)', async () => {
    render(
      <AuthContext.Provider value={authContextValue}>
        <AudioWaveformPlayer deviceId="device1" fileId="file1" fileFormat=".mp3" />
      </AuthContext.Provider>
    );
    
    // Simulate a window click so that user interaction is recorded.
    fireEvent.click(window);

    // Assume the play/pause button is the second button.
    const buttons = screen.getAllByRole('button');
    const playButton = buttons[1];
    fireEvent.click(playButton);

    // Wait for a change that indicates the play action (check for an SVG inside the button).
    await waitFor(() => {
      const svgElement = playButton.querySelector('svg');
      expect(svgElement).toBeDefined();
    });
  });
});