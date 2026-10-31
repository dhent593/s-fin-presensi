import React from 'react';

interface AttendanceFeedbackCardProps {
  feedback: { success: boolean; message: string } | null;
  onDismiss: () => void;
}

export const AttendanceFeedbackCard: React.FC<AttendanceFeedbackCardProps> = ({
  feedback,
  onDismiss,
}) => {
  if (!feedback) return null;

  return (
    <div
      onClick={onDismiss}
      className={`cursor-pointer rounded-3xl p-5 mb-6 text-center border shadow-lg transition-all active:scale-98 animate-scale-up ${
        feedback.success
          ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10'
          : 'bg-red-500 text-white border-red-600 shadow-red-500/10'
      }`}
    >
      <div className="flex items-center justify-center mb-2">
        {feedback.success ? (
          <div className="bg-white text-emerald-600 p-2.5 rounded-full shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        ) : (
          <div className="bg-white text-red-600 p-2.5 rounded-full shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-xl font-black leading-snug">{feedback.message}</p>
      <p className="text-[10px] opacity-75 mt-2 font-bold uppercase tracking-wider">
        Ketuk kartu ini untuk menutup
      </p>
    </div>
  );
};

