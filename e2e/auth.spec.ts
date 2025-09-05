import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display auth form on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check if auth form is displayed
    await expect(page.getByText('Sign in to Coach')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should handle email input', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.getByLabel('Email');
    await emailInput.fill('test@example.com');
    
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should show loading state when submitting', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.getByLabel('Email');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    await emailInput.fill('test@example.com');
    
    // Mock the network request to delay response
    await page.route('**/auth/v1/otp', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ error: null }),
      });
    });
    
    await submitButton.click();
    
    // Check for loading state
    await expect(page.getByText('Sending...')).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test('should handle successful sign in', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.getByLabel('Email');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    await emailInput.fill('test@example.com');
    
    // Mock successful response
    await page.route('**/auth/v1/otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ error: null }),
      });
    });
    
    await submitButton.click();
    
    // Check for success message
    await expect(page.getByText('Check your email for the magic link!')).toBeVisible();
  });

  test('should handle sign in error', async ({ page }) => {
    await page.goto('/');
    
    const emailInput = page.getByLabel('Email');
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    await emailInput.fill('invalid-email');
    
    // Mock error response
    await page.route('**/auth/v1/otp', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: { message: 'Invalid email address' } 
        }),
      });
    });
    
    await submitButton.click();
    
    // Check for error message
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('should prevent submission with empty email', async ({ page }) => {
    await page.goto('/');
    
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    // Try to submit without email
    await submitButton.click();
    
    // Should not show loading state or success message
    await expect(page.getByText('Sending...')).not.toBeVisible();
    await expect(page.getByText('Check your email for the magic link!')).not.toBeVisible();
  });
});
