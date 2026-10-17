import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sparkles, Tag, ArrowRight } from 'lucide-react';

export const ArticleCard = ({ article }) => {
  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col justify-between group">
      <div>
        {/* Source & Date */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {article.source || 'General Source'}
          </span>
          <span className="text-[11px] text-slate-500">
            {new Date(article.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
          {article.title}
        </h3>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {article.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-700/50"
              >
                <Tag className="w-2.5 h-2.5 text-indigo-400" />
                {tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="text-[10px] font-medium text-slate-500 px-1 py-0.5">
                +{article.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-6 pt-4 border-t border-gray-800/60">
        <Link
          to={`/articles/${article._id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all duration-200 group/btn"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:text-white transition-colors" />
          <span>Read & Summarize</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

export default ArticleCard;
