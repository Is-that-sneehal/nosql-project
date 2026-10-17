import React from 'react';
import { Link } from 'react-router-dom';
import { Book, Globe2, Headphones, User, ArrowRight } from 'lucide-react';


export const BookCard = ({ book }) => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Cover / Header */}
        <div className="h-44 relative overflow-hidden bg-gradient-to-br from-indigo-950/40 to-slate-900 flex items-center justify-center border-b border-gray-800">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-indigo-400 transition-colors">
              <Book className="w-12 h-12 stroke-[1.5]" />
              <span className="text-[11px] font-medium tracking-wide uppercase mt-1">Book</span>
            </div>
          )}

          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wide bg-indigo-500/20 text-indigo-300 rounded-full backdrop-blur-md border border-indigo-500/30">
              {book.genre || 'General'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
            {book.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>{book.author}</span>
          </div>
          <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
            {book.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="p-5 pt-0">
        <Link
          to={`/books/${book._id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 group/btn"
        >
          <Headphones className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:text-white transition-colors" />
          <span>Read & Listen</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default BookCard;
