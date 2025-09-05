import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthForm } from '@/components/auth/auth-form';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
jest.mock('@/lib/supabase/client');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock window.location
delete (window as any).location;
(window as any).location = {
  origin: 'http://localhost:3000',
};

describe('AuthForm', () => {
  let mockSupabase: any;
  let mockSignInWithOtp: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSignInWithOtp = jest.fn();
    mockSupabase = {
      auth: {
        signInWithOtp: mockSignInWithOtp,
      },
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should render the auth form correctly', () => {
    render(<AuthForm />);

    expect(screen.getByText('Sign in to Coach')).toBeInTheDocument();
    expect(
      screen.getByText('Enter your email to receive a magic link')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('should handle email input changes', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should handle successful sign in', async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockResolvedValue({ error: null });

    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Check your email for the magic link!')
      ).toBeInTheDocument();
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
  });

  it('should handle sign in error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Invalid email address';
    mockSignInWithOtp.mockResolvedValue({ error: { message: errorMessage } });

    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should handle unexpected errors', async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockRejectedValue(new Error('Network error'));

    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error occurred')
      ).toBeInTheDocument();
    });
  });

  it('should prevent form submission with empty email', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // Should not call signInWithOtp with empty email
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('should clear message when form is resubmitted', async () => {
    const user = userEvent.setup();
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'First error' } });

    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // First submission with error
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First error')).toBeInTheDocument();
    });

    // Second submission should clear the message
    mockSignInWithOtp.mockResolvedValue({ error: null });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });

  it('should have proper form validation', async () => {
    const user = userEvent.setup();
    render(<AuthForm />);

    const emailInput = screen.getByLabelText('Email');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Test with invalid email format
    await user.type(emailInput, 'not-an-email');
    await user.click(submitButton);

    // The form should still submit (validation is handled by Supabase)
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'not-an-email',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
  });
});
