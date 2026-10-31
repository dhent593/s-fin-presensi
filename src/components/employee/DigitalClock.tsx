import React from 'react';

interface DigitalClockProps {
  timeString: string;
  dateString: string;
}

export const DigitalClock: React.FC<DigitalClockProps> = ({ timeString, dateString }) => {
  return (
    <div className="bg-gradient-to-b from-orange-500 to-orange-600 px-6 pt-5 pb-16 rounded-b-[3rem] shadow-sm relative overflow-hidden">
      {/* Widget Waktu & Tanggal */}
      <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-5 text-center border border-white/20 shadow-inner relative z-10">
        <p className="text-4xl font-black text-white tracking-wider drop-shadow-sm">{timeString}</p>
        <p className="text-xs font-black text-orange-100 mt-1.5 uppercase tracking-wider">{dateString}</p>
      </div>
    </div>
  );
};

