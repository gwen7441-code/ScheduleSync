import React, { useState } from 'react';
import { Database, RefreshCw, Key, ShieldCheck, Server, AlertCircle, Info, Mail, Sparkles } from 'lucide-react';
import { Dynamics365Config, SyncStats } from '../types';

interface CRMSetupPanelProps {
  config: Dynamics365Config;
  onUpdateConfig: (newConfig: Partial<Dynamics365Config & { sendgridApiKey?: string }>) => Promise<any>;
  syncStats: SyncStats;
  onTriggerSync: () => Promise<any>;
}

export default function CRMSetupPanel({ config, onUpdateConfig, syncStats, onTriggerSync }: CRMSetupPanelProps) {
  const [tenantId, setTenantId] = useState(config.tenantId || '');
  const [clientId, setClientId] = useState(config.clientId || '');
  const [clientSecret, setClientSecret] = useState('');
  const [environmentUrl, setEnvironmentUrl] = useState(config.environmentUrl || '');
  const [activeEntityName, setActiveEntityName] = useState(config.activeEntityName || 'msevents_firstaidcourses');
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setIsError(false);
    
    try {
      const res = await onUpdateConfig({
        tenantId,
        clientId,
        clientSecret,
        environmentUrl,
        activeEntityName,
        sendgridApiKey
      });
      setIsError(false);
      setMessage(res.connection?.message || 'Configuration parameters updated successfully!');
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || 'Failed to update credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await onTriggerSync();
      setIsError(false);
      setMessage(res.message || `Dataverse connectivity test completed.`);
    } catch (err: any) {
      setIsError(true);
      setMessage(err.message || 'Dynamics 365 connection timed out. Verify your Entra client ID settings.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-5 w-full">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-5">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900">Dynamics 365 & SendGrid Gateway</h2>
          <p className="text-[11px] text-gray-500">Configure OAuth 2.0 Web API and priority transactional email delivery settings</p>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className={`p-3.5 rounded-lg mb-5 flex items-start gap-3 border ${
        config.isConnected 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-amber-50 border-amber-200 text-gray-800'
      }`}>
        {config.isConnected ? (
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 text-[11px] leading-relaxed">
          <p className="font-bold">
            {config.isConnected 
              ? 'Dataverse Credentials Present' 
              : 'Demo Mode Active'}
          </p>
          <p className="opacity-90 mt-0.5">
            {config.isConnected 
              ? `Server-side credentials are present for ${config.environmentUrl}. Use Sync to verify the IT schema mapping.`
              : 'Live Dataverse credentials are not configured yet. The portal is using local demo records.'}
          </p>
        </div>
        {config.isConnected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2.5 rounded-md shadow-xs transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-xs font-mono mb-4 border ${
          isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {message}
        </div>
      )}

      {/* CRM Credential Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-1">Dynamics 365 Environment URL</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                <Server className="w-3.5 h-3.5" />
              </span>
              <input
                type="url"
                value={environmentUrl}
                onChange={(e) => setEnvironmentUrl(e.target.value)}
                placeholder="https://firstaidcorp.crm.dynamics.com"
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs rounded-lg border border-gray-300 pl-8 pr-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-1">Microsoft Entra Tenant ID</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                <Key className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="11111111-2222-3333-4444-555555555555"
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs rounded-lg border border-gray-300 pl-8 pr-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-1">Application (Client) ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 5cb03598-a2cb-4ee2..."
              className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs rounded-lg border border-gray-300 px-3 py-1.5 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={config.clientId ? "••••••••••••••••" : "Azure Entra ID Secret Key"}
              className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs rounded-lg border border-gray-300 px-3 py-1.5 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* SendGrid Section */}
        <div className="border-t border-gray-100 pt-3.5 mt-3">
          <label className="block text-[10px] font-bold text-indigo-700 flex items-center gap-1 mb-1.5 uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            SendGrid Alert Email Setting
          </label>
          <input
            type="password"
            value={sendgridApiKey}
            onChange={(e) => setSendgridApiKey(e.target.value)}
            placeholder={config.sendgridConfigured ? "Configured on server" : "Optional local test key"}
            className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-hidden focus:border-indigo-500"
          />
          <div className="bg-indigo-50/50 rounded-md p-2 mt-2 border border-indigo-100/60 text-[9px] text-indigo-800 leading-normal flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-indigo-500 mt-0.5" />
            <div>
              <p className="font-semibold">Production setup note:</p>
              <p className="text-gray-650 opacity-90 mt-0.5">
                IT should set <strong>SENDGRID_API_KEY</strong>, <strong>SENDGRID_FROM_EMAIL</strong>, and <strong>ADMIN_ALERT_EMAIL</strong> on the server. A key pasted here is only used for the current local test session and is not saved.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition duration-150 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Testing Credentials...' : 'Save Configuration Parameters'}
        </button>
      </form>

      {/* Entity Guide */}
      <div className="bg-gray-50 rounded-lg p-3.5 mt-4 text-[10px] text-gray-600 border border-gray-200">
        <h4 className="font-bold text-gray-800 flex items-center gap-1 mb-1 uppercase tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400/25" />
          Dynamics 365 Event Architecture
        </h4>
        <p className="leading-normal">
          The live adapter tests <code className="bg-gray-150 px-1 rounded-sm text-[9px]">/contacts</code> for instructors and <span className="inline font-mono text-[9px] bg-gray-150 p-0.5 rounded-sm">{activeEntityName}</span> for courses. IT still needs to confirm exact field mappings before launch.
        </p>
      </div>
    </div>
  );
}
