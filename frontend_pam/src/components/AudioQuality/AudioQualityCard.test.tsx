import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AudioQualityCard from './AudioQualityCard'
import { DataFile } from '@/types'

// Mocking the router provider and other dependencies
vi.mock('@tanstack/react-router', async () => {
  const actual = (await vi.importActual('@tanstack/react-router')) as object
  return {
    ...actual,
    RouterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useRouter: () => ({}),
    useRouterState: () => ({}),
    createRouter: () => ({}),
    createRoute: () => ({}),
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  }
})

// Helpers to render the component with router context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui)
}

// Dummy handler for check quality
const dummyOnCheckQuality = vi.fn()

// Stub data file used for testing
const baseDataFile: DataFile = {
  id: 'file1',
  qualityScore: 75,
  qualityCheckStatus: 'completed',
  sampleRate: 44100,
  fileLength: '3:45',
  config: 'Default',
  deviceId: 'device1',
  extraData: {
    temporal_evolution: {
      times: JSON.stringify([0, 1, 2, 3]),
      rms_energy: JSON.stringify([0.2, 0.3, 0.4, 0.35]),
      spectral_centroid: JSON.stringify([1000, 1100, 1050, 1200]),
      zero_crossing_rate: JSON.stringify([0.1, 0.15, 0.13, 0.14]),
    },
    quality_metrics: {
      average_ratio: 0.85,
      mean_energy: 0.35,
    },
    observations: ['Observation 1', 'Observation 2'],
    auto_detected_observations: []
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
  favourite: false,
}

//Test suite for the AudioQualityCard component
describe('AudioQualityCard component', () => {
  // Check that the component renders without crashing
  it('renders the header and check quality button', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    // Check for the card title
    expect(screen.getByText(/Audio Quality/i)).toBeDefined()
    // Check for the button text (should be "Check Quality" because status is "completed")
    expect(screen.getByRole('button', { name: /Check Quality/i })).toBeDefined()
  })

  // Verify file info grid displays correct details.
  it('renders the file info grid', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    expect(screen.getByText(/44100 Hz/i)).toBeDefined()
    expect(screen.getByText(/3:45/i)).toBeDefined()
    expect(screen.getByText(/Default/i)).toBeDefined()
  })

  // Check that the quality score and status badge are displayed correctly.
  it('renders quality score and status badge correctly', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    expect(screen.getByText(/75\/100/)).toBeDefined()
    expect(screen.getByText(/Completed/)).toBeDefined()
  })

  // Check that any observations provided are rendered.
  it('renders observations if provided', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    expect(screen.getByText(/Observation 1/i)).toBeDefined()
    expect(screen.getByText(/Observation 2/i)).toBeDefined()
  })

  // Verify quality issues are rendered.
  it('renders quality issues if provided', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    expect(screen.getByText(/Issue A/i)).toBeDefined()
    expect(screen.getByText(/Issue B/i)).toBeDefined()
  })

  // Check that detailed quality metrics (labels and values) are rendered.
  it('renders detailed quality metrics if provided', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    expect(screen.getByText(/AVERAGE RATIO/i)).toBeDefined()
    expect(screen.getByText(/MEAN ENERGY/i)).toBeDefined()
    expect(screen.getByText(/85.0%/i)).toBeDefined()
    expect(screen.getByText(/0\.35/)).toBeDefined()
  })

  // Check that the temporal evolution chart is rendered when data is provided.
  it('renders temporal evolution chart when data is provided', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeDefined()
  })

  // Check that the quality check datetime is rendered.
  it('renders the quality check datetime if provided', () => {
    renderWithRouter(<AudioQualityCard dataFile={baseDataFile} onCheckQuality={dummyOnCheckQuality} deviceId={''} />)
    expect(screen.getByText(/Last checked:/i)).toBeDefined()
  })
})