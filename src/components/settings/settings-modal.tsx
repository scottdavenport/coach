'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useOuraIntegration } from '@/hooks/use-oura-integration';
import { OuraOAuthFlow } from './oura-oauth-flow';
import { TrendPreferences } from './trend-preferences';
import { TimezoneSelector } from './timezone-selector';
import {
  Settings,
  X,
  Link,
  RefreshCw,
  Eye,
  CheckCircle,
  Circle,
  Clock,
  Trash2,
  Download,
  UserX,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function SettingsModal({ isOpen, onClose, userId }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    'integrations' | 'preferences' | 'data'
  >('integrations');
  const [showOuraOAuth, setShowOuraOAuth] = useState(false);

  const {
    integration: ouraIntegration,
    loading: ouraLoading,
    error: ouraError,
    isConnected: ouraConnected,
    connectOura,
    disconnectOura,
    syncOuraData,
  } = useOuraIntegration({ userId });

  const handleOuraConnect = async (
    accessToken: string,
    refreshToken: string
  ) => {
    try {
      await connectOura(accessToken, refreshToken);
      setShowOuraOAuth(false);
    } catch (error) {
      console.error('Failed to connect Oura:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Show Oura OAuth flow if needed
  if (showOuraOAuth) {
    return createPortal(
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-card border border-line/40 rounded-lg shadow-xl w-full max-w-md">
          <OuraOAuthFlow
            onSuccess={handleOuraConnect}
            onCancel={() => setShowOuraOAuth(false)}
          />
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-card border border-line/40 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line/40">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line/40">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'integrations'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link className="h-4 w-4" />
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'preferences'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'data'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trash2 className="h-4 w-4" />
            Data Management
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Health Integrations</h3>

              {/* Oura Ring Integration */}
              <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Link className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Oura Ring</h4>
                      <p className="text-sm text-muted-foreground">
                        Sync sleep, activity, and readiness data
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ouraConnected ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={
                        ouraConnected
                          ? 'text-green-500'
                          : 'text-muted-foreground'
                      }
                    >
                      {ouraConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>

                  {ouraConnected && ouraIntegration?.last_sync_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last sync:</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(
                          ouraIntegration.last_sync_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {ouraError && (
                    <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md p-2">
                      Error: {ouraError}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {ouraConnected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => syncOuraData()}
                          disabled={ouraLoading}
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${ouraLoading ? 'animate-spin' : ''}`}
                          />
                          {ouraLoading ? 'Syncing...' : 'Sync Now'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-3 w-3" />
                          View Data
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={disconnectOura}
                          disabled={ouraLoading}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => setShowOuraOAuth(true)}
                        disabled={ouraLoading}
                      >
                        <Link className="h-3 w-3" />
                        Connect Oura Ring
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Future Integrations */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Coming Soon
                </h4>

                <div className="bg-muted/30 border border-line/30 rounded-lg p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <Link className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h5 className="font-medium">Apple Health</h5>
                      <p className="text-xs text-muted-foreground">
                        Sync health and fitness data
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 border border-line/30 rounded-lg p-4 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                      <Link className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h5 className="font-medium">Fitbit</h5>
                      <p className="text-xs text-muted-foreground">
                        Sync activity and sleep data
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-8">
              <TimezoneSelector userId={userId} />

              <div className="border-t border-line/40 pt-8">
                <TrendPreferences userId={userId} />
              </div>

              <div className="border-t border-line/40 pt-8">
                <div className="flex items-center gap-2 mb-6">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Sync Preferences</h3>
                </div>

                <div className="space-y-6">
                  <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Auto-sync frequency</h4>
                        <p className="text-sm text-muted-foreground">
                          How often to automatically sync data
                        </p>
                      </div>
                      <select className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors">
                        <option value="multiple">Multiple times per day</option>
                        <option value="daily">Once daily</option>
                        <option value="manual">Manual only</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Import historical data</h4>
                        <p className="text-sm text-muted-foreground">
                          Import past data when connecting
                        </p>
                      </div>
                      <select className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors">
                        <option value="30">Last 30 days</option>
                        <option value="7">Last 7 days</option>
                        <option value="0">No historical data</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Data priority</h4>
                        <p className="text-sm text-muted-foreground">
                          Which data source to trust when conflicts occur
                        </p>
                      </div>
                      <select className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors">
                        <option value="api">API data (recommended)</option>
                        <option value="manual">Manual entries</option>
                        <option value="prompt">Ask me each time</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Data Management</h3>

              <div className="space-y-4">
                <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Export Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download all your health data as a JSON file
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-3 w-3" />
                    Export All Data
                  </Button>
                </div>

                <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Clear All Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Remove all your health data and start fresh
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All Data
                  </Button>
                </div>

                <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data
                  </p>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <UserX className="h-3 w-3" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
