import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/60 text-sm font-medium text-slate-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-gray-900/40 rounded-lg border border-gray-800/80">
        Page <span className="text-indigo-400 font-bold">{currentPage}</span> of <span className="text-slate-200">{totalPages}</span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/60 text-sm font-medium text-slate-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
