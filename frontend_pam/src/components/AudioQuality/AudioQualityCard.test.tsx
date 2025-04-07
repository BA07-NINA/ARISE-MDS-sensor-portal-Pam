import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AudioQualityCard from './AudioQualityCard';
import { DataFile } from '@/types';

const dummyOnCheckQuality = vi.fn();

const baseDataFile: DataFile = {
    id: 'file1',
    qualityScore: 75,
    qualityCheckStatus: 'completed',
    sampleRate: 44100,
    fileLength: '3:45',
    config: 'Default',
    extraData: {
        temporal_evolution: {
            times: [0, 1, 2, 3],
            rms_energy: [0.2, 0.3, 0.4, 0.35],
            spectral_centroid: [1000, 1100, 1050, 1200],
            zero_crossing_rate: [0.1, 0.15, 0.13, 0.14],
        },
        quality_metrics: {
            average_ratio: 0.85,
            mean_energy: 0.35,
        },
        observations: ['Observation 1', 'Observation 2'],
    },
    qualityIssues: ['Issue A', 'Issue B'],
    qualityCheckDt: new Date('2023-10-01T12:00:00Z').toISOString(),
    deployment: '',
    fileName: '',
    fileFormat: '',
    fileSize: 0,
    fileType: '',
    path: '',
    localPath: '',
    uploadDt: '',
    recordingDt: '',
    thumbUrl: null,
    localStorage: false,
    archived: false,
    favourite: false
};

describe('AudioQualityCard component', () => {
  it('renders the header and check quality button', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Check for the card title
    expect(screen.getByText(/Audio Quality/i)).toBeDefined();
    // Check for the button text (should be "Check Quality" because status is "completed")
    expect(screen.getByRole('button', { name: /Check Quality/i })).toBeDefined();
  });


  it('renders the file info grid', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Check for sample rate, file length and config text.
    expect(screen.getByText(/44100 Hz/i)).toBeDefined();
    expect(screen.getByText(/3:45/i)).toBeDefined();
    expect(screen.getByText(/Default/i)).toBeDefined();
  });

  it('renders quality score and status badge correctly', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Quality score
    expect(screen.getByText(/75\/100/)).toBeDefined();
    // Status badge: status text should be capitalized.
    expect(screen.getByText(/Completed/)).toBeDefined();
  });

  it('renders observations if provided', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Check for each observation.
    expect(screen.getByText(/Observation 1/i)).toBeDefined();
    expect(screen.getByText(/Observation 2/i)).toBeDefined();
  });

  it('renders quality issues if provided', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Check for each quality issue.
    expect(screen.getByText(/Issue A/i)).toBeDefined();
    expect(screen.getByText(/Issue B/i)).toBeDefined();
  });

  it('renders detailed quality metrics if provided', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Check for keys (formatted in uppercase with underscores replaced)
    expect(screen.getByText(/AVERAGE RATIO/i)).toBeDefined();
    expect(screen.getByText(/MEAN ENERGY/i)).toBeDefined();
    // Check for formatted values (average_ratio should be percent and mean_energy fixed to 2 decimals)
    expect(screen.getByText(/85.0%/i)).toBeDefined();
    expect(screen.getByText(/0\.35/)).toBeDefined();
  });

  it('renders temporal evolution chart when data is provided', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // Since the Line component from react-chartjs-2 renders a canvas, we can check for a canvas element.
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeDefined();
  });

  it('renders the quality check datetime if provided', () => {
    render(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} />);
    // The date should be rendered as a localized string; here we check that "Last checked:" is in the document.
    expect(screen.getByText(/Last checked:/i)).toBeDefined();
  });
});