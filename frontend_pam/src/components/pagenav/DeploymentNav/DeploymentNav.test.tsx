import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeploymentNav from './DeploymentNav';
import '@testing-library/jest-dom';

describe('DeploymentNav component', () => {
  it('renders all tabs', () => {
    render(<DeploymentNav activeTab="deviceDetails" setActiveTab={() => {}} />);
    expect(screen.getByText('Site Details')).toBeInTheDocument();
    expect(screen.getByText('Device Details')).toBeInTheDocument();
    expect(screen.getByText('Data Files')).toBeInTheDocument();
    expect(screen.getByText('Map', { selector: 'span.hidden.sm\\:inline' })).toBeInTheDocument();
  });

  it('calls setActiveTab with correct values when tabs are clicked', () => {
    const setActiveTab = vi.fn();
    render(<DeploymentNav activeTab="deviceDetails" setActiveTab={setActiveTab} />);
  
    fireEvent.click(screen.getByText('Data Files'));
    expect(setActiveTab).toHaveBeenCalledWith('datafiles');
  
    fireEvent.click(screen.getByText('Site Details'));
    expect(setActiveTab).toHaveBeenCalledWith('siteDetails');
  
    const mapSpans = screen.getAllByText('Map', { selector: 'span' });
    const mapLabel = mapSpans.find(
      (el) => el.className.includes('hidden') && el.className.includes('sm:inline')
    );
    expect(mapLabel).toBeDefined();
    fireEvent.click(mapLabel!.closest('button')!);
    expect(setActiveTab).toHaveBeenCalledWith('map');
  
    fireEvent.click(screen.getByText('Device Details'));
    expect(setActiveTab).toHaveBeenCalledWith('deviceDetails');
  });
});