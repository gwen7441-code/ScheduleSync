import React, { useEffect, useState } from 'react';
import { Briefcase, Mail, Phone, ShieldAlert, Users, X } from 'lucide-react';
import { FirstAidCourse, Trainee } from '../types';

interface CourseRosterModalProps {
  course: FirstAidCourse;
  isOpen: boolean;
  onClose: () => void;
  onSaveRoster: (courseId: string, trainees: Trainee[]) => Promise<void>;
}

export default function CourseRosterModal({ course, isOpen, onClose, onSaveRoster }: CourseRosterModalProps) {
  const [trainees, setTrainees] = useState<Trainee[]>(course.trainees || []);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setTrainees(course.trainees || []);
    setSaveState('idle');
  }, [course.id, course.trainees]);

  if (!isOpen) return null;

  const handleToggleStatus = (index: number) => {
    const updated = [...trainees];
    const current = updated[index].status;
    updated[index].status = current === 'Passed' ? 'NoShow' : current === 'Registered' ? 'Passed' : 'Registered';
    setTrainees(updated);
    setSaveState('idle');
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await onSaveRoster(course.id, trainees);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-end justify-center z-50">
      <div className="bg-slate-950 border-t border-slate-800 w-full max-h-[85%] rounded-t-2xl flex flex-col shadow-2xl animate-in slide-in-from-bottom pb-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-900 sticky top-0 bg-slate-950/90 backdrop-blur-md z-15">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">Course Attendance Roster</h4>
              <p className="text-[9px] text-slate-400 tracking-tight">{course.code} • Max {course.maxRegistered} Trainees</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-900 rounded-full text-slate-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course Core Specs */}
        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-900/60 text-[10px] text-slate-300">
          <div className="font-bold text-slate-200 text-xs mb-1">{course.title}</div>
          <p className="text-[10px] text-slate-400">{course.location}</p>
        </div>

        {/* Trainees list info */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {trainees.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-[11px] leading-relaxed">
              <ShieldAlert className="w-7 h-7 mx-auto text-slate-700 mb-1.5" />
              <span>No attendees registered in CRM registry for this course yet.</span>
            </div>
          ) : (
            trainees.map((t, idx) => (
              <div 
                key={idx}
                className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2 relative transition hover:border-slate-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-100">{t.name}</h5>
                    {t.company && (
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 font-sans">
                        <Briefcase className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{t.company}</span>
                      </div>
                    )}
                  </div>

                  {/* Status interactive badge */}
                  <button
                    onClick={() => handleToggleStatus(idx)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition cursor-pointer select-none ${
                      t.status === 'Passed' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40' :
                      t.status === 'NoShow' ? 'bg-rose-950/60 text-rose-400 border-rose-900/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {t.status}
                  </button>
                </div>

                {/* Sub contacts */}
                <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 border-t border-slate-950/60 pt-2 font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{t.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-sans">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{t.phone}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footnote */}
        <div className="px-4 pt-1 text-[9px] text-slate-500 text-center leading-relaxed">
          <span>Tap the status badge to switch between <strong>Registered</strong>, <strong>Passed</strong>, or <strong>NoShow</strong> to log certification success directly.</span>
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-[10px] transition"
          >
            {saveState === 'saving' ? 'Saving roster...' : saveState === 'saved' ? 'Roster saved' : 'Save roster changes'}
          </button>
          {saveState === 'error' && (
            <p className="text-rose-400 mt-1">Could not save roster. Please retry.</p>
          )}
        </div>
      </div>
    </div>
  );
}
