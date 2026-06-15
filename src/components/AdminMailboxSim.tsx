import React, { useState } from 'react';
import { Mail, ArrowRight, User, Calendar, Trash2, Check, Clock, AlertTriangle } from 'lucide-react';
import { AdminEmailLog } from '../types';

interface AdminMailboxSimProps {
  logs: AdminEmailLog[];
  onClearLogs?: () => void;
}

export default function AdminMailboxSim({ logs, onClearLogs }: AdminMailboxSimProps) {
  const [selectedMail, setSelectedMail] = useState<AdminEmailLog | null>(null);

  return (
    <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-xl p-5 w-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-md">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100">Coordinating Admin Mailbox Simulator</h3>
            <p className="text-[10px] text-slate-400">Shows admin alert payloads and real SendGrid delivery status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-slate-900 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono">
            {logs.length} logged
          </span>
          {logs.length > 0 && onClearLogs && (
            <button
              onClick={onClearLogs}
              className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Alerts List */}
        <div className="border border-slate-800 rounded-lg overflow-hidden h-72 overflow-y-auto bg-slate-900/40">
          <div className="bg-slate-900/80 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex justify-between">
            <span>Incoming Alerts (Admin Queue)</span>
            <span className="text-emerald-400 font-mono text-[9px] lowercase">sendgrid-aware log</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Mail className="w-8 h-8 mx-auto text-slate-700 mb-2" />
              <p>No administrative email dispatches logged yet.</p>
              <p className="text-[10px] text-slate-600 mt-1">Updates to schedule availabilities will generate incoming mail here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {logs.map((mail) => (
                <button
                  key={mail.id}
                  onClick={() => setSelectedMail(mail)}
                  className={`w-full text-left p-3 hover:bg-slate-900 transition flex flex-col gap-1 ${
                    selectedMail?.id === mail.id ? 'bg-slate-900/90 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-indigo-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {mail.instructorName}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(mail.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 line-clamp-1">{mail.subject}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400">
                    <span className={`px-1.5 py-0.2 rounded-xs font-mono text-[8xs] uppercase ${
                      mail.actionType === 'addition' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/30' :
                      mail.actionType === 'removal' ? 'bg-rose-950/80 text-rose-400 border border-rose-900/30' : 'bg-amber-950/80 text-amber-400 border border-amber-900/35'
                    }`}>
                      {mail.actionType}
                    </span>
                    <span className={`font-bold ${
                      mail.status === 'Sent' ? 'text-emerald-400' : mail.status === 'Failed' ? 'text-rose-400' : 'text-amber-400'
                    }`}>{mail.status}</span>
                    <span className="text-slate-500">{mail.toEmail}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Email Mail Reader Viewer */}
        <div className="border border-slate-800 rounded-lg overflow-hidden h-72 flex flex-col bg-slate-900/80 text-slate-300">
          <div className="bg-slate-900 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex justify-between items-center">
            <span>Alert Body Inspector</span>
            {selectedMail && (
              <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950 px-1.5 py-0.5 rounded-sm">
                <Check className="w-3 h-3" /> {selectedMail.status}
              </span>
            )}
          </div>

          {!selectedMail ? (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-500 text-xs p-4 text-center">
              <Clock className="w-6 h-6 text-slate-700 mb-2" />
              <p>Select an administrative notification from the queue to inspect email details, headers, and payload html.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Mail Headers */}
              <div className="bg-slate-950/60 p-3 border-b border-slate-800/80 text-[10px] font-mono space-y-1">
                <div><span className="text-slate-500">From:</span> auto-alerts@crm.firstaidpro.com</div>
                <div><span className="text-slate-500">To:</span> <span className="text-rose-400 font-bold">{selectedMail.toEmail}</span></div>
                <div><span className="text-slate-500">Subject:</span> <span className="text-slate-200 font-bold">{selectedMail.subject}</span></div>
                <div><span className="text-slate-500">Delivery:</span> <span className="text-slate-200">{selectedMail.deliveryMessage || selectedMail.status}</span></div>
              </div>

              {/* Rendered HTML inside simulator */}
              <div className="flex-1 p-4 overflow-y-auto bg-white/5 font-sans leading-normal text-xs text-slate-300">
                <div 
                  className="bg-white text-gray-900 rounded-lg overflow-hidden translate-y-0 scale-100 max-w-full"
                  dangerouslySetInnerHTML={{ __html: selectedMail.bodyHtml }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
