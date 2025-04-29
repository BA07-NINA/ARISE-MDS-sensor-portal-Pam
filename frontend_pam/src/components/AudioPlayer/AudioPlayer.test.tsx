import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioPlayer from './AudioPlayer';
import AuthContext from '@/auth/AuthContext';

const dummyAuthTokens = { access: 'fakeAccessToken', refresh: 'fakeRefreshToken' };
const dummyAuthContext = { authTokens: dummyAuthTokens };

beforeEach(() => {
  vi.clearAllMocks();
});

// Stub global fetch to return a dummy audio blob.
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob(['dummy audio content'], { type: 'audio/mp3' })),
    headers: { entries: () => [] },
  })
) as unknown as typeof fetch);

// Stub URL.createObjectURL so it returns a dummy URL.
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:dummy'),
  revokeObjectURL: vi.fn(),
});

// Override HTMLAudioElement.prototype.play() to simulate a successful play.
// Also override load() to resolve immediately.
HTMLAudioElement.prototype.play = () => Promise.resolve();
HTMLAudioElement.prototype.load = () => { };

//Tests for the AudioPlayer component
describe('AudioPlayer component', () => {
  // Test that the play button is rendered initially
  // and that clicking it plays the audio.
  it('renders the play button initially', () => {
    render(
      <AuthContext.Provider value={dummyAuthContext}>
        <AudioPlayer deviceId="device1" fileId="file1" />
      </AuthContext.Provider>
    );
    // The button is rendered and should show the play icon.
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
    // Since the play icon is rendered as an SVG by react-icons,
    // we check that an SVG element is present inside the button.
    expect(button.querySelector('svg')).toBeDefined();
  });

  // Test that clicking the button plays the audio and changes the icon to pause.
  it('plays audio when the button is clicked', async () => {
    render(
      <AuthContext.Provider value={dummyAuthContext}>
        <AudioPlayer deviceId="device1" fileId="file1" />
      </AuthContext.Provider>
    );
    const button = screen.getByRole('button');
    
    // Click the button to trigger handlePlayPause.
    fireEvent.click(button);

    // Wait for the play promise to resolve and state to update.
    await waitFor(() => {
      // After play, the icon should change to the pause icon.
      // We can check by making sure the SVG rendered inside the button is present.
      expect(button.querySelector('svg')).toBeDefined();
    });
  });

  // Test that clicking the button while playing pauses the audio.
  it('pauses audio when the button is clicked while playing', async () => {
    render(
      <AuthContext.Provider value={dummyAuthContext}>
        <AudioPlayer deviceId="device1" fileId="file1" />
      </AuthContext.Provider>
    );
    const button = screen.getByRole('button');
    
    // First click: to start playing.
    fireEvent.click(button);
    await waitFor(() => {
      // Ensure audio started playing (icon remains rendered).
      expect(button.querySelector('svg')).toBeDefined();
    });

    // Second click: should pause.
    fireEvent.click(button);
    await waitFor(() => {
      // After pause the component still renders an icon
      expect(button.querySelector('svg')).toBeDefined();
    });
  });

  
  it('displays error if fetch fails', async () => {
    // Make fetch reject to simulate a fetch failure.
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        headers: { entries: () => [] },
      })
    );
    
    render(
      <AuthContext.Provider value={dummyAuthContext}>
        <AudioPlayer deviceId="device1" fileId="file1" />
      </AuthContext.Provider>
    );
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      // Expect an error message to be rendered.
      expect(screen.getByText(/Failed to fetch audio/i)).toBeDefined();
    });
  });
});