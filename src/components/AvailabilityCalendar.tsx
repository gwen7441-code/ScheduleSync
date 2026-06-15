import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Sparkles } from 'lucide-react';
import { FirstAidCourse, Instructor, ScheduleAvailability } from '../types';

interface AvailabilityCalendarProps {
  instructor: Instructor;
  schedules: ScheduleAvailability[];
  courses: FirstAidCourse[];
  onSaveSchedule: (datesToAdd: string[], datesToRemove: string[]) => Promise<any>;
}

export default function AvailabilityCalendar({ instructor, schedules, courses, onSaveSchedule }: AvailabilityCalendarProps) {
  const firstRelevantDate = useMemo(() => {
    const courseDate = courses.find(c => c.instructorId === instructor.id)?.date;
    const scheduleDate = schedules.find(s => s.instructorId === instructor.id)?.date;
    return courseDate || scheduleDate || new Date().toISOString().slice(0, 10);
  }, [courses, instructor.id, schedules]);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = firstRelevantDate.split('-').map(Number);
    return new Date(year, month - 1, 1);
  });
  const [pendingAvailable, setPendingAvailable] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  const currentAvailableDates = useMemo(() => (
    schedules
      .filter(s => s.instructorId === instructor.id && s.status === 'available')
      .map(s => s.date)
  ), [instructor.id, schedules]);

  const assignedCourses = courses.filter(c => c.instructorId === instructor.id);
  const assignedDates = assignedCourses.map(c => c.date);

  useEffect(() => {
    setPendingAvailable(currentAvailableDates);
  }, [currentAvailableDates]);

  useEffect(() => {
    const [year, month] = firstRelevantDate.split('-').map(Number);
    setVisibleMonth(new Date(year, month - 1, 1));
  }, [firstRelevantDate, instructor.id]);

  const year = visibleMonth.getFullYear();
  const monthIdx = visibleMonth.getMonth();
  const monthName = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const totalDays = new Date(year, monthIdx + 1, 0).getDate();
  const emptyDaysBefore = new Date(year, monthIdx, 1).getDay();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const handleDayToggle = (dateStr: string) => {
    setUiError(null);

    if (assignedDates.includes(dateStr)) {
      setUiError(`Warning: ${dateStr} has an assigned course. Removing availability will create an admin alert once saved.`);
    }

    setPendingAvailable(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setAiAnalysis(null);
    setUiError(null);

    const datesToAdd = pendingAvailable.filter(d => !currentAvailableDates.includes(d));
    const datesToRemove = currentAvailableDates.filter(d => !pendingAvailable.includes(d));

    try {
      const result = await onSaveSchedule(datesToAdd, datesToRemove);
      const status = result?.emailLogged?.status || 'Simulated';
      setSuccessMsg(`Availability updated. Admin alert status: ${status}.`);
      setTimeout(() => setSuccessMsg(null), 7000);
    } catch (err: any) {
      setUiError(`Failed to save availability: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestAIAdvisor = async () => {
    setAiLoading(true);
    setAiAnalysis(null);

    const datesToAdd = pendingAvailable.filter(d => !currentAvailableDates.includes(d));
    const datesToRemove = currentAvailableDates.filter(d => !pendingAvailable.includes(d));

    try {
      const response = await fetch('/api/ai/conflict-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructorId: instructor.id,
          proposedDates: {
            datesToAdd,
            datesToRemove,
            currentSelection: pendingAvailable
          }
        })
      });
      const data = await response.json();
      setAiAnalysis(data.report);
    } catch {
      setAiAnalysis("Unable to reach the AI scheduling advisor. Using offline rule protection.");
    } finally {
      setAiLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div id="availability-section" className="bg-white rounded-2xl border border-gray-155 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="font-bold text-gray-900 text-sm">Update My Availability</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => changeMonth(-1)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-semibold">Prev</button>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-semibold">
            {monthName}
          </span>
          <button onClick={() => changeMonth(1)} className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full font-semibold">Next</button>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
        Toggle dates where you are free to teach first aid courses. Removing availability on assigned days creates an admin alert when email is configured.
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1.5 font-mono">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {Array.from({ length: emptyDaysBefore }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9"></div>
        ))}

        {daysArray.map((day) => {
          const paddedDay = `${day}`.padStart(2, '0');
          const month = `${monthIdx + 1}`.padStart(2, '0');
          const dateStr = `${year}-${month}-${paddedDay}`;
          const isAssigned = assignedDates.includes(dateStr);
          const isAvailable = pendingAvailable.includes(dateStr);

          let dayStyle = "bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-100";
          if (isAssigned) {
            dayStyle = "bg-rose-50 border border-rose-300 text-rose-700 font-bold hover:bg-rose-100 ring-2 ring-rose-200/50";
          } else if (isAvailable) {
            dayStyle = "bg-emerald-500 text-white font-semibold shadow-xs hover:bg-emerald-600";
          }

          return (
            <button
              key={dateStr}
              onClick={() => handleDayToggle(dateStr)}
              className={`h-9 flex flex-col justify-center items-center rounded-lg text-xs transition cursor-pointer select-none relative ${dayStyle}`}
            >
              <span>{day}</span>
              {isAssigned && <span className="absolute bottom-0.5 w-1 h-1 bg-rose-600 rounded-full"></span>}
              {isAvailable && !isAssigned && <span className="absolute bottom-0.5 w-1 h-1 bg-white/80 rounded-full"></span>}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 text-[10px] font-medium text-gray-500 border-t border-gray-100 pt-3 mb-4">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Available</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-50 border border-rose-200"></span> Assigned Course</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200"></span> Unmarked</span>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleRequestAIAdvisor}
          disabled={aiLoading}
          className="flex-1 text-[11px] bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          {aiLoading ? 'Analyzing...' : 'AI Conflict Advisor'}
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isSaving ? 'Saving Changes...' : 'Save Schedule'}
        </button>
      </div>

      {uiError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg text-[10px] font-sans flex items-start gap-1.5 mb-2.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
          <span>{uiError}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-850 p-2.5 rounded-lg text-[10px] font-sans flex items-start gap-1.5 mb-2.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {aiAnalysis && (
        <div className="bg-indigo-900/5 hover:bg-indigo-900/10 transition border border-indigo-200/50 p-3.5 rounded-xl text-xs text-gray-700 leading-relaxed font-sans mt-3">
          <div className="font-bold text-indigo-900 flex items-center gap-1 mb-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-400/20" />
            <span>Scheduling Analysis Report</span>
          </div>
          <div className="text-[11px] whitespace-pre-wrap max-h-56 overflow-y-auto pr-1">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
}
