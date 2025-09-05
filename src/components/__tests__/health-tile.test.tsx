import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HealthTile } from '@/components/dashboard/health-tile';
import { DashboardMetric } from '@/hooks/use-dashboard-insights';

// Mock the AdaptiveTile component
jest.mock('@/components/dashboard/adaptive-tile', () => ({
  AdaptiveTile: ({ children, onEdit, onChat, ...props }: any) => (
    <div data-testid="adaptive-tile" {...props}>
      {children}
      {onEdit && (
        <button onClick={onEdit} data-testid="edit-button">
          Edit
        </button>
      )}
      {onChat && (
        <button onClick={onChat} data-testid="chat-button">
          Chat
        </button>
      )}
    </div>
  ),
}));

describe('HealthTile', () => {
  const mockMetrics: DashboardMetric[] = [
    {
      id: '1',
      metric_key: 'sleep_score',
      metric_value: 85,
      unit: 'score',
      date: '2023-01-01',
      trend: 'up',
      change_percentage: 5,
    },
    {
      id: '2',
      metric_key: 'energy_level',
      metric_value: 7,
      unit: 'level',
      date: '2023-01-01',
      trend: 'stable',
      change_percentage: 0,
    },
    {
      id: '3',
      metric_key: 'readiness_score',
      metric_value: 75,
      unit: 'score',
      date: '2023-01-01',
      trend: 'down',
      change_percentage: -3,
    },
    {
      id: '4',
      metric_key: 'resting_heart_rate',
      metric_value: 65,
      unit: 'bpm',
      date: '2023-01-01',
      trend: 'stable',
      change_percentage: 0,
    },
  ];

  it('should render health tile with all metrics', () => {
    render(<HealthTile metrics={mockMetrics} />);

    expect(screen.getByTestId('adaptive-tile')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // Sleep score
    expect(screen.getByText('7/10')).toBeInTheDocument(); // Energy level
    expect(screen.getByText('75')).toBeInTheDocument(); // Readiness score
    expect(screen.getByText('65')).toBeInTheDocument(); // Heart rate
  });

  it('should display correct score colors for high scores', () => {
    render(<HealthTile metrics={mockMetrics} />);

    // High scores (>= 80) should be green
    const sleepScore = screen.getByText('85');
    expect(sleepScore).toHaveClass('text-green-400');
  });

  it('should display correct score colors for medium scores', () => {
    const mediumMetrics: DashboardMetric[] = [
      {
        id: '1',
        metric_key: 'sleep_score',
        metric_value: 70,
        unit: 'score',
        date: '2023-01-01',
        trend: 'stable',
        change_percentage: 0,
      },
    ];

    render(<HealthTile metrics={mediumMetrics} />);

    // Medium scores (60-79) should be yellow
    const sleepScore = screen.getByText('70');
    expect(sleepScore).toHaveClass('text-yellow-400');
  });

  it('should display correct score colors for low scores', () => {
    const lowMetrics: DashboardMetric[] = [
      {
        id: '1',
        metric_key: 'sleep_score',
        metric_value: 45,
        unit: 'score',
        date: '2023-01-01',
        trend: 'down',
        change_percentage: -10,
      },
    ];

    render(<HealthTile metrics={lowMetrics} />);

    // Low scores (< 60) should be red
    const sleepScore = screen.getByText('45');
    expect(sleepScore).toHaveClass('text-red-400');
  });

  it('should handle missing metrics gracefully', () => {
    const emptyMetrics: DashboardMetric[] = [];
    render(<HealthTile metrics={emptyMetrics} />);

    expect(screen.getByTestId('adaptive-tile')).toBeInTheDocument();
    // Should not crash and should render empty state
  });

  it('should handle partial metrics', () => {
    const partialMetrics: DashboardMetric[] = [
      {
        id: '1',
        metric_key: 'sleep_score',
        metric_value: 85,
        unit: 'score',
        date: '2023-01-01',
        trend: 'up',
        change_percentage: 5,
      },
    ];

    render(<HealthTile metrics={partialMetrics} />);

    expect(screen.getByText('85')).toBeInTheDocument(); // Sleep score
    // Other metrics should show as missing/empty
  });

  it('should call onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<HealthTile metrics={mockMetrics} onEdit={mockOnEdit} />);

    const editButton = screen.getByTestId('edit-button');
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('should call onChat when chat button is clicked', () => {
    const mockOnChat = jest.fn();
    render(<HealthTile metrics={mockMetrics} onChat={mockOnChat} />);

    const chatButton = screen.getByTestId('chat-button');
    fireEvent.click(chatButton);

    expect(mockOnChat).toHaveBeenCalledTimes(1);
  });

  it('should handle different metric key variations', () => {
    const variantMetrics: DashboardMetric[] = [
      {
        id: '1',
        metric_key: 'sleep_quality', // Alternative key
        metric_value: 85,
        unit: 'score',
        date: '2023-01-01',
        trend: 'up',
        change_percentage: 5,
      },
      {
        id: '2',
        metric_key: 'energy', // Alternative key
        metric_value: 7,
        unit: 'level',
        date: '2023-01-01',
        trend: 'stable',
        change_percentage: 0,
      },
      {
        id: '3',
        metric_key: 'readiness', // Alternative key
        metric_value: 75,
        unit: 'score',
        date: '2023-01-01',
        trend: 'down',
        change_percentage: -3,
      },
      {
        id: '4',
        metric_key: 'heart_rate', // Alternative key
        metric_value: 65,
        unit: 'bpm',
        date: '2023-01-01',
        trend: 'stable',
        change_percentage: 0,
      },
    ];

    render(<HealthTile metrics={variantMetrics} />);

    expect(screen.getByText('85')).toBeInTheDocument(); // Sleep quality
    expect(screen.getByText('7/10')).toBeInTheDocument(); // Energy
    expect(screen.getByText('75')).toBeInTheDocument(); // Readiness
    expect(screen.getByText('65')).toBeInTheDocument(); // Heart rate
  });

  it('should display correct energy level colors', () => {
    const energyMetrics: DashboardMetric[] = [
      {
        id: '1',
        metric_key: 'energy_level',
        metric_value: 8, // High energy
        unit: 'level',
        date: '2023-01-01',
        trend: 'up',
        change_percentage: 2,
      },
    ];

    render(<HealthTile metrics={energyMetrics} />);

    // High energy (>= 7) should be green
    const energyValue = screen.getByText('8/10');
    expect(energyValue).toHaveClass('text-green-400');
  });

  it('should handle undefined values gracefully', () => {
    const undefinedMetrics: DashboardMetric[] = [
      {
        id: '1',
        metric_key: 'sleep_score',
        metric_value: undefined as any,
        unit: 'score',
        date: '2023-01-01',
        trend: 'stable',
        change_percentage: 0,
      },
    ];

    render(<HealthTile metrics={undefinedMetrics} />);

    // Should not crash and should handle undefined values
    expect(screen.getByTestId('adaptive-tile')).toBeInTheDocument();
  });

  it('should render with correct tile title', () => {
    render(<HealthTile metrics={mockMetrics} />);

    // The tile should have a health-related title
    expect(screen.getByText(/health/i)).toBeInTheDocument();
  });
});
