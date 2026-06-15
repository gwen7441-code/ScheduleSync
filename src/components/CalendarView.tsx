import React, { useState } from 'react';
import { CalendarCheck, CalendarDays, Clock, MapPin } from 'lucide-react';
import { FirstAidCourse } from '../types';

interface CalendarViewProps {
  courses: FirstAidCourse[];
  onSelectCourse: (course: FirstAidCourse) => void;
}

type CalendarFilter = 'day' | 'week' | 'month';

export default function CalendarView({ courses, onSelectCourse }: CalendarViewProps) {
  const [filterMode, setFilterMode] = useState<CalendarFilter>('month');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const dayLabel = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const filtered = courses.filter(c => {
    if (c.status !== 'Confirmed') return false;
    const courseDate = new Date(c.date + 'T00:00:00');

    if (filterMode === 'day') {
      return courseDate.toDateString() === today.toDateString();
    }
    if (filterMode === 'week') {
      return courseDate >= weekStart && courseDate <= weekEnd;
    }
    return courseDate.getMonth() === today.getMonth() && courseDate.getFullYear() === today.getFullYear();
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 flex gap-1">
        {(['day', 'week', 'month'] as CalendarFilter[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold tracking-wider uppercase transition-all duration-150 ${
              filterMode === mode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1 text-[9px] font-mono text-slate-400">
        <span>Active Timeline View</span>
        <span className="text-slate-300 font-semibold uppercase">
          {filterMode === 'day' && `Today: ${dayLabel}`}
          {filterMode === 'week' && `Week: ${weekLabel}`}
          {filterMode === 'month' && `Month: ${monthLabel}`}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 bg-slate-900/40 border border-dashed border-slate-800/80 rounded-xl">
            <CalendarCheck className="w-5 h-5 mx-auto text-slate-700 mb-1" />
            <p className="text-[10px] text-slate-500 font-medium">No confirmed courses booked in this view range</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCourse(c)}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition text-left relative overflow-hidden group shadow-lg"
            >
              <div className={`absolute top-0 right-0 w-1.5 h-full ${
                c.type === 'SFA' ? 'bg-red-500' :
                c.type === 'BLS' ? 'bg-sky-500' :
                c.type === 'WFA' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />

              <div className="flex justify-between items-start mb-1.5 pr-2">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-tight">{c.code}</span>
                <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[8px] font-bold font-sans">
                  {c.type === 'SFA' ? 'Standard 1st Aid' :
                   c.type === 'BLS' ? 'BLS Healthcare' :
                   c.type === 'WFA' ? 'Wilderness Lead' : 'Basic CPR'}
                </span>
              </div>

              <h4 className="text-[11px] font-extrabold text-slate-100 group-hover:text-indigo-300 leading-tight transition-colors mb-2">{c.title}</h4>

              <div className="space-y-1 text-[9px] text-slate-400 font-sans">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-slate-200">{new Date(c.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{c.time}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{c.location}</span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-900 flex justify-between items-center text-[8px]">
                <span className="font-mono text-emerald-400 font-medium">Confirmed</span>
                <span className="text-slate-400 font-bold hover:underline transition">View Trainee Roster</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
