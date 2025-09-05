import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user', email: 'test@example.com' }
      }));
    });
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/chat');
    
    // Check for chat elements
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
  });

  test('should handle message input and sending', async ({ page }) => {
    await page.goto('/chat');
    
    const messageInput = page.getByRole('textbox');
    const sendButton = page.getByRole('button', { name: /send/i });
    
    // Type a message
    await messageInput.fill('Hello, how are you?');
    await expect(messageInput).toHaveValue('Hello, how are you?');
    
    // Mock API response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'I am doing well, thank you for asking!',
          conversationId: 'test-conv-id'
        }),
      });
    });
    
    // Send message
    await sendButton.click();
    
    // Check that message appears in chat
    await expect(page.getByText('Hello, how are you?')).toBeVisible();
  });

  test('should handle file upload', async ({ page }) => {
    await page.goto('/chat');
    
    // Check for file upload button
    const fileUploadButton = page.getByRole('button', { name: /upload/i });
    if (await fileUploadButton.isVisible()) {
      // Create a test file
      const fileInput = page.locator('input[type="file"]');
      
      // Mock file upload
      await page.route('**/api/files/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            files: [{ name: 'test.pdf', url: 'https://example.com/test.pdf' }]
          }),
        });
      });
      
      // Upload file
      await fileInput.setInputFiles({
        name: 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test file content')
      });
      
      // Check for file preview
      await expect(page.getByText('test.pdf')).toBeVisible();
    }
  });

  test('should handle chat errors gracefully', async ({ page }) => {
    await page.goto('/chat');
    
    const messageInput = page.getByRole('textbox');
    const sendButton = page.getByRole('button', { name: /send/i });
    
    await messageInput.fill('Test message');
    
    // Mock API error
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    await sendButton.click();
    
    // Check for error message
    await expect(page.getByText(/error/i)).toBeVisible();
  });

  test('should handle rate limiting', async ({ page }) => {
    await page.goto('/chat');
    
    const messageInput = page.getByRole('textbox');
    const sendButton = page.getByRole('button', { name: /send/i });
    
    await messageInput.fill('Test message');
    
    // Mock rate limit response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Too many requests. Please slow down.',
          remaining: 0,
          resetTime: Date.now() + 60000
        }),
      });
    });
    
    await sendButton.click();
    
    // Check for rate limit message
    await expect(page.getByText(/too many requests/i)).toBeVisible();
  });

  test('should display conversation history', async ({ page }) => {
    await page.goto('/chat');
    
    // Mock conversation history
    await page.route('**/api/chat/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          messages: [
            { id: 1, content: 'Hello', role: 'user', timestamp: new Date().toISOString() },
            { id: 2, content: 'Hi there!', role: 'assistant', timestamp: new Date().toISOString() }
          ]
        }),
      });
    });
    
    // Check for conversation history
    await expect(page.getByText('Hello')).toBeVisible();
    await expect(page.getByText('Hi there!')).toBeVisible();
  });

  test('should handle long messages', async ({ page }) => {
    await page.goto('/chat');
    
    const messageInput = page.getByRole('textbox');
    const longMessage = 'This is a very long message that should test the chat interface ability to handle lengthy user input and display it properly in the chat history. '.repeat(10);
    
    await messageInput.fill(longMessage);
    await expect(messageInput).toHaveValue(longMessage);
    
    // Mock API response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'I received your long message!',
          conversationId: 'test-conv-id'
        }),
      });
    });
    
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();
    
    // Check that long message is displayed
    await expect(page.getByText(longMessage.substring(0, 50))).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    await page.goto('/chat');
    
    const messageInput = page.getByRole('textbox');
    await messageInput.fill('Test message');
    
    // Mock API response
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Response to test message',
          conversationId: 'test-conv-id'
        }),
      });
    });
    
    // Test Enter key to send message
    await messageInput.press('Enter');
    
    // Check that message was sent
    await expect(page.getByText('Test message')).toBeVisible();
  });
});
