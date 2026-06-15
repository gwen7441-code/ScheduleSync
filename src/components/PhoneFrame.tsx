import React, { useState } from 'react';
import { Smartphone, Shield, Wifi, Battery, Radio, Sparkles } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  activeOS: 'android_pixel' | 'ios_iphone';
  setActiveOS: (os: 'android_pixel' | 'ios_iphone') => void;
}

export default function PhoneFrame({ children, activeOS, setActiveOS }: PhoneFrameProps) {
  const [batteryLevel] = useState(94);
  const currentTime = "09:41";

  return (
    <div className="flex flex-col items-center bg-gray-50 p-4 rounded-3xl border border-gray-200 shadow-sm max-w-md mx-auto w-full">
      {/* OS Target Switcher */}
      <div className="flex bg-gray-200 p-1 rounded-full mb-4 w-full text-xs font-medium">
        <button
          onClick={() => setActiveOS('ios_iphone')}
          className={`flex-1 py-1.5 rounded-full text-center transition ${
            activeOS === 'ios_iphone' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Apple iOS device
        </button>
        <button
          onClick={() => setActiveOS('android_pixel')}
          className={`flex-1 py-1.5 rounded-full text-center transition ${
            activeOS === 'android_pixel' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Google Android device
        </button>
      </div>

      {/* Phone Body Wrapper */}
      <div
        className={`relative w-full aspect-[9/19.5] max-w-[380px] bg-white text-slate-900 shadow-2xl transition-all duration-300 overflow-hidden ${
          activeOS === 'ios_iphone'
            ? 'rounded-[48px] border-[10px] border-slate-900 ring-4 ring-slate-800'
            : 'rounded-[32px] border-[8px] border-slate-950 ring-2 ring-slate-900'
        }`}
      >
        {/* Apple Dynamic Island / Notch */}
        {activeOS === 'ios_iphone' ? (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-50 flex items-center justify-between px-2.5">
            <div className="w-2 h-2 rounded-full bg-slate-900/80 border border-slate-700/30"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-505/20 block"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
          </div>
        ) : (
          /* Android Camera Punch Hole */
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 w-4.5 h-4.5 bg-slate-950 rounded-full z-50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
          </div>
        )}

        {/* Device Status Bar */}
        <div className={`flex justify-between items-center px-6 pt-3 pb-1 text-[11px] font-semibold tracking-tight select-none z-40 bg-slate-900 text-white`}>
          <span className="font-sans">{currentTime}</span>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" />
            <Radio className="w-3 h-3 text-indigo-400" />
            <div className="flex items-center gap-0.5 bg-white/20 px-1 py-0.5 rounded-xs">
              <span className="text-[9px] scale-90">{batteryLevel}%</span>
              <Battery className="w-3.5 h-3.5 text-white fill-white/80" />
            </div>
          </div>
        </div>

        {/* Content View port (Mobile application container) */}
        <div className="relative w-full h-[calc(100%-28px)] bg-slate-50 flex flex-col overflow-y-auto">
          {children}
        </div>
        
        {/* iOS Soft Home Indicator */}
        {activeOS === 'ios_iphone' && (
          <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-400/80 rounded-full z-50 pointer-events-none"></div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
        <Shield className="w-3.5 h-3.5 text-emerald-500" />
        <span>Emulating {activeOS === 'ios_iphone' ? 'iPhone 15' : 'Pixel 8 Pro'} Viewport</span>
      </div>
    </div>
  );
}
