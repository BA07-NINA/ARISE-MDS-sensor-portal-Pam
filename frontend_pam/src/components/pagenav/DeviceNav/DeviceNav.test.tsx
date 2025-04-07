import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceNav from './DeviceNav';
import '@testing-library/jest-dom';

describe('DeviceNav component', () => {
  it('renders both tabs', () => {
    render(<DeviceNav activeTab="details" setActiveTab={() => {}} />);
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Data Files')).toBeInTheDocument();
  });


  it('calls setActiveTab with correct value when clicked', () => {
    const setActiveTab = vi.fn();
    render(<DeviceNav activeTab="details" setActiveTab={setActiveTab} />);

    fireEvent.click(screen.getByText('Data Files'));
    expect(setActiveTab).toHaveBeenCalledWith('datafiles');

    fireEvent.click(screen.getByText('Details'));
    expect(setActiveTab).toHaveBeenCalledWith('details');
  });
});
