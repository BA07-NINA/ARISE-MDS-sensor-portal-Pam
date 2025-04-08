import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import DeviceForm from './DeviceForm';
import AuthContext from '@/auth/AuthContext';
import { postData } from '@/utils/FetchFunctions';

vi.mock('@/utils/FetchFunctions', () => ({
  postData: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeviceForm component', () => {
  const fakeToken = "fake-token";
  const renderWithAuth = (onSave = vi.fn(), token = fakeToken) => {
    return render(
      <AuthContext.Provider value={{ authTokens: { access: token } }}>
        <DeviceForm onSave={onSave} />
      </AuthContext.Provider>
    );
  };

  it('renders all form fields', () => {
    renderWithAuth();
    expect(screen.getByLabelText(/Device ID/i)).toBeDefined();
    expect(screen.getByLabelText(/Deployment ID/i)).toBeDefined();
    expect(screen.getByLabelText(/Country/i)).toBeDefined();
    expect(screen.getByLabelText(/Site/i)).toBeDefined();
    expect(screen.getByLabelText(/Date/i)).toBeDefined();
    expect(screen.getByLabelText(/Time \(UTC\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Latitude/i)).toBeDefined();
    expect(screen.getByLabelText(/Longitude/i)).toBeDefined();
    expect(screen.getByLabelText(/Coordinate Uncertainty/i)).toBeDefined();
    expect(screen.getByLabelText(/GPS Device/i)).toBeDefined();
    expect(screen.getByLabelText(/Microphone Height/i)).toBeDefined();
    expect(screen.getByLabelText(/Microphone Direction/i)).toBeDefined();
    expect(screen.getByLabelText(/Habitat/i)).toBeDefined();
    expect(screen.getByLabelText(/Score/i)).toBeDefined();
    expect(screen.getByLabelText(/Protocol Checklist/i)).toBeDefined();
    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Sim Card ICC/i)).toBeDefined();
    expect(screen.getByLabelText(/SIM Card Batch/i)).toBeDefined();
    expect(screen.getByLabelText(/SD Card Size \(GB\)/i)).toBeDefined();
    expect(screen.getByLabelText(/Configuration/i)).toBeDefined();
    expect(screen.getByLabelText(/Comment/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeDefined();
  });

  it('calls onSave when submission is successful', async () => {
    const onSave = vi.fn();
    // postData is mocked to resolve successfully for both calls.
    (postData as Mock)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    renderWithAuth(onSave);

    fireEvent.change(screen.getByPlaceholderText(/Enter device ID/i), { target: { value: 'DEVICE123' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter deployment ID/i), { target: { value: 'DEPLOY123' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter configuration/i), { target: { value: 'summer' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter Sim Card ICC/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter SIM Card Batch/i), { target: { value: 'batch1' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter SD Card Size/i), { target: { value: '64' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter country/i), { target: { value: 'Norway' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter site/i), { target: { value: 'Site A' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter date/i), { target: { value: '2025-04-01' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter latitude/i), { target: { value: '56.093493' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter longitude/i), { target: { value: '72.098765' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit/i }));
    });

    await waitFor(() => {
      expect(postData).toHaveBeenCalledTimes(2);
    });

    expect(postData).toHaveBeenNthCalledWith(1, "devices/upsert_device/", fakeToken, {
      device_ID: 'DEVICE123',
      configuration: 'summer',
      sim_card_icc: '12345',
      sim_card_batch: 'batch1',
      sd_card_size: '64',
    });

    expect(postData).toHaveBeenNthCalledWith(2, "deployment/upsert_deployment/", fakeToken, {
      deployment_ID: 'DEPLOY123',
      start_date: '2025-04-01',
      end_date: "",
      lastUpload: "",
      folder_size: 0,
      country: 'Norway',
      site_name: 'Site A',
      latitude: '56.093493',
      longitude: '72.098765',
      coordinate_uncertainty: "",
      gps_device: "",
      mic_height: "",
      mic_direction: "",
      habitat: "",
      score: "",
      protocol_checklist: "",
      user_email: "",
      comment: "",
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
  });
});