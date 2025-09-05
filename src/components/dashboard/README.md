# Minimal Dashboard System

This directory contains the new Oura-inspired minimal dashboard components.

## Components

- `minimal-dashboard.tsx` - Main dashboard component with 3 hero metrics
- `hero-metric-card.tsx` - Reusable metric card with trend visualization
- `trend-chart.tsx` - Simple trend visualization component

## Mock Data System

The dashboard includes a mock data system for development and testing:

### Enabling Mock Data

1. Create a `.env.local` file in your project root
2. Add: `USE_MOCK_DASHBOARD=true`
3. Restart your development server

### Mock Data Features

- **Realistic Data**: Sleep scores (65-95), Readiness scores (60-90), Weight (150-200 lbs)
- **Trend Variations**: Shows improving, declining, and stable trends
- **Easy Removal**: Set `USE_MOCK_DASHBOARD=false` or remove the env var to disable
- **No Breaking Changes**: Mock data is completely separate from real data

### Mock Data Structure

```typescript
interface MockWeeklyData {
  current: number;           // Current week's value
  trend: 'up' | 'down' | 'stable';
  weeklyData: number[];      // 7 days of data
  change: number;           // Percentage change from previous week
}
```

## Design Principles

- **Minimal & Clean**: Single column layout with lots of white space
- **Hero Metrics**: 3 key metrics prominently displayed
- **Trend Focus**: Weekly progress visualization is the star
- **Theme Match**: Uses existing dark theme variables
- **Not Busy**: Removes clutter, focuses on what drives daily usage

## Chat Integration

Each metric card includes an "Ask about this trend" button that:
- Pre-populates chat with contextual questions
- Closes the dashboard modal
- Enables natural conversation flow

## Responsive Design

- Works on mobile and desktop
- Uses existing theme variables for consistency
- Smooth animations and transitions
- Proper accessibility support

## Usage

```tsx
import { MinimalDashboard } from './minimal-dashboard';

<MinimalDashboard
  userId={userId}
  onChatMessage={(message) => {
    // Handle chat message
    console.log(message);
  }}
/>
```

## Environment Variables

- `USE_MOCK_DASHBOARD=true` - Enable mock data (development only)
- `NODE_ENV=development` - Required for mock data to work