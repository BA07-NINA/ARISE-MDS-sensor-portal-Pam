import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeviceForm from './DeviceForm';

// Clear mocks before each test.
beforeEach(() => {
  vi.clearAllMocks();
});

// Stub global fetch to simulate successful device creation.
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as unknown as typeof fetch);

describe('DeviceForm component', () => {
  it('renders all form fields', () => {
    render(<DeviceForm />);
    // Verify that the label elements and inputs are rendered.
    expect(screen.getByLabelText(/Device ID/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter device ID/i)).toBeDefined();

    expect(screen.getByLabelText(/Name/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter device name/i)).toBeDefined();

    expect(screen.getByLabelText(/Model/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter device model/i)).toBeDefined();

    expect(screen.getByLabelText(/Device Status/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter device status/i)).toBeDefined();

    // Check the configuration select and its options.
    expect(screen.getByLabelText(/Configuration/i)).toBeDefined();
    expect(screen.getByRole('option', { name: /Select configuration/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Summer/i })).toBeDefined();
    expect(screen.getByRole('option', { name: /Winter/i })).toBeDefined();

    expect(screen.getByLabelText(/SIM Card ICC/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter SIM card ICC/i)).toBeDefined();

    expect(screen.getByLabelText(/SIM Card Batch/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter SIM card batch/i)).toBeDefined();

    expect(screen.getByLabelText(/SD Card Size \(GB\)/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Enter SD card size in GB/i)).toBeDefined();

    // Verify that the submit button is rendered.
    expect(screen.getByRole('button', { name: /Create Device/i })).toBeDefined();
  });

  it('shows validation errors when required fields are missing', async () => {
    render(<DeviceForm />);
    // Submit the form without filling in required fields.
    const submitButton = screen.getByRole('button', { name: /Create Device/i });
    fireEvent.click(submitButton);

    // Wait until the validation errors appear.
    await waitFor(() => {
      expect(screen.getByText(/Device ID is required/i)).toBeDefined();
      expect(screen.getByText(/Name is required/i)).toBeDefined();
      expect(screen.getByText(/Model is required/i)).toBeDefined();
    });
  });

  it('calls fetch with correct values on valid submission', async () => {
    render(<DeviceForm />);
    // Fill out the form with valid data.
    fireEvent.change(screen.getByPlaceholderText(/Enter device ID/i), { target: { value: 'DEVICE123' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter device name/i), { target: { value: 'Device Name' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter device model/i), { target: { value: 'Model X' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter device status/i), { target: { value: 'active' } });

    // Change the select for configuration.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'summer' } });

    fireEvent.change(screen.getByPlaceholderText(/Enter SIM card ICC/i), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter SIM card batch/i), { target: { value: 'batch1' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter SD card size in GB/i), { target: { value: 64 } });

    // Submit the form.
    const submitButton = screen.getByRole('button', { name: /Create Device/i });
    fireEvent.click(submitButton);

    // Wait for the fetch to be called.
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Verify the correct payload was sent.
    expect(fetch).toHaveBeenCalledWith("/api/devices/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: 'DEVICE123',
        name: 'Device Name',
        model: 'Model X',
        deviceStatus: 'active',
        configuration: 'summer',
        simCardIcc: '12345',
        simCardBatch: 'batch1',
        sdCardSize: 64,
      }),
    });
  });
});