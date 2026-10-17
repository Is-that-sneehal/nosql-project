import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { Users, Mail, Calendar, Shield } from 'lucide-react';

export const MemberList = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get('/admin/members');
        setMembers(res.data);
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Users className="w-6 h-6 text-emerald-400" />
          Registered Library Members
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Directory of registered patrons who can access regional translation and article summarization.
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 border-b border-gray-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-6 py-4">Patron Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Member ID</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No registered members found yet.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{member.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                      {member._id}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(member.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        <Shield className="w-2.5 h-2.5" />
                        Active Member
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
