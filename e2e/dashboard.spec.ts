import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - simulate logged in user
    await page.goto('/');
    
    // Mock the auth state to simulate logged in user
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test('should display dashboard after authentication', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for dashboard elements
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    await expect(page.getByText(/health/i)).toBeVisible();
    await expect(page.getByText(/activity/i)).toBeVisible();
  });

  test('should display health metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock health data
    await page.route('**/api/health/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          metrics: [
            { metric_key: 'sleep_score', value: 85, unit: 'score' },
            { metric_key: 'energy_level', value: 7, unit: 'level' },
            { metric_key: 'readiness_score', value: 75, unit: 'score' },
          ]
        }),
      });
    });
    
    // Check for health metrics
    await expect(page.getByText('85')).toBeVisible(); // Sleep score
    await expect(page.getByText('7')).toBeVisible(); // Energy level
    await expect(page.getByText('75')).toBeVisible(); // Readiness score
  });

  test('should handle empty health data', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock empty health data
    await page.route('**/api/health/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ metrics: [] }),
      });
    });
    
    // Should still display dashboard without crashing
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test('should display activity tiles', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock activity data
    await page.route('**/api/activity/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activities: [
            { type: 'workout', duration: 30, calories: 300 },
            { type: 'walk', duration: 15, calories: 100 },
          ]
        }),
      });
    });
    
    // Check for activity elements
    await expect(page.getByText(/workout/i)).toBeVisible();
    await expect(page.getByText(/walk/i)).toBeVisible();
  });

  test('should handle dashboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for navigation elements
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Test navigation to different sections
    if (await page.getByText(/insights/i).isVisible()) {
      await page.getByText(/insights/i).click();
      await expect(page.getByText(/insights/i)).toBeVisible();
    }
  });

  test('should display responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Check that dashboard is still functional on mobile
    await expect(page.getByText(/dashboard/i)).toBeVisible();
    
    // Check for mobile-specific elements or layout
    const dashboard = page.getByTestId('dashboard') || page.getByText(/dashboard/i);
    await expect(dashboard).toBeVisible();
  });

  test('should handle dashboard loading states', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock slow API response
    await page.route('**/api/health/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ metrics: [] }),
      });
    });
    
    // Check for loading indicators
    await expect(page.getByText(/loading/i)).toBeVisible();
  });

  test('should handle dashboard errors gracefully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mock API error
    await page.route('**/api/health/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    // Should display error message or fallback
    await expect(page.getByText(/error/i)).toBeVisible();
  });
});
