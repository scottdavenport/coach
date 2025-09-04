import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OuraIntegration {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  last_sync_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseOuraIntegrationProps {
  userId: string;
}

export function useOuraIntegration({ userId }: UseOuraIntegrationProps) {
  const [integration, setIntegration] = useState<OuraIntegration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch integration status
  const fetchIntegration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error } = await supabase
        .from('oura_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setIntegration(data);
    } catch (err) {
      console.error('Error fetching Oura integration:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch integration'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Connect Oura account
  const connectOura = async (accessToken: string, refreshToken?: string) => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Calculate token expiry (Oura tokens typically last 1 year)
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1);

      const { data, error } = await supabase
        .from('oura_integrations')
        .upsert(
          {
            user_id: userId,
            access_token: accessToken,
            refresh_token: refreshToken,
            token_expires_at: tokenExpiresAt.toISOString(),
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      setIntegration(data);
      return data;
    } catch (err) {
      console.error('Error connecting Oura:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect Oura');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Disconnect Oura account
  const disconnectOura = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { error } = await supabase
        .from('oura_integrations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      setIntegration(null);
    } catch (err) {
      console.error('Error disconnecting Oura:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to disconnect Oura'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sync Oura data
  const syncOuraData = async (importHistory: boolean = false) => {
    if (!integration) {
      throw new Error('No Oura integration found');
    }

    try {
      setLoading(true);
      setError(null);

      // Import the sync service
      const { ouraSyncService } = await import('@/lib/oura/sync-service');

      // Sync data
      await ouraSyncService.syncOuraData({
        userId,
        importHistory,
      });

      // Refresh integration data
      await fetchIntegration();
    } catch (err) {
      console.error('Error syncing Oura data:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync data');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Check if token is expired
  const isTokenExpired = () => {
    if (!integration?.token_expires_at) return false;
    return new Date(integration.token_expires_at) < new Date();
  };

  // Get connection status
  const getConnectionStatus = () => {
    if (!integration) return 'disconnected';
    if (isTokenExpired()) return 'expired';
    return 'connected';
  };

  // Initialize
  useEffect(() => {
    if (userId) {
      fetchIntegration();
    }
  }, [userId, fetchIntegration]);

  return {
    integration,
    loading,
    error,
    isConnected: !!integration && !isTokenExpired(),
    connectionStatus: getConnectionStatus(),
    connectOura,
    disconnectOura,
    syncOuraData,
    refreshIntegration: fetchIntegration,
  };
}
