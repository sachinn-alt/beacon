import React, { useState } from "react";
import { motion } from "motion/react";
import { LeaderboardUser } from "../types";
import { Award, Shield, Trophy, UserCheck, Zap } from "lucide-react";

interface LeaderboardProps {
  users: LeaderboardUser[];
  userProfile: { name: string; points: number; reports: number; verifications: number };
  onUpdateUsername: (name: string) => void;
}

export default function Leaderboard({ users, userProfile, onUpdateUsername }: LeaderboardProps) {
  const [usernameInput, setUsernameInput] = useState(userProfile.name);
  const [isEditing, setIsEditing] = useState(false);

  const getBadgeIcon = (points: number) => {
    if (points >= 800) return Trophy;
    if (points >= 500) return Shield;
    if (points >= 300) return Award;
    return UserCheck;
  };

  const getBadgeName = (points: number) => {
    if (points >= 800) return "Civic Champion";
    if (points >= 500) return "Community Pillar";
    if (points >= 300) return "Local Guardian";
    if (points >= 100) return "First Responder";
    return "Active Citizen";
  };

  const getBadgeColor = (points: number) => {
    if (points >= 800) return "text-amber-700 bg-amber-50 border-amber-200";
    if (points >= 500) return "text-indigo-600 bg-indigo-50 border-indigo-200";
    if (points >= 300) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (points >= 100) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  // Compute points to next badge
  const nextBadgePoints = userProfile.points >= 800 ? 1000 : userProfile.points >= 500 ? 800 : userProfile.points >= 300 ? 500 : userProfile.points >= 100 ? 300 : 100;
  const progressPct = Math.min(Math.round((userProfile.points / nextBadgePoints) * 100), 100);

  const BadgeIcon = getBadgeIcon(userProfile.points);

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      onUpdateUsername(usernameInput.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. User's Personal Civic Card */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          {/* Background decorative ring */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-50 border border-indigo-100 pointer-events-none" />

          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl border ${getBadgeColor(userProfile.points)} shadow-sm`}>
              <BadgeIcon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <form onSubmit={handleSaveUsername} className="flex gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 outline-none w-full"
                    maxLength={20}
                    autoFocus
                  />
                  <button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2.5 py-1 rounded-lg">Save</button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-slate-800 truncate">{userProfile.name}</h4>
                  <button onClick={() => setIsEditing(true)} className="text-[10px] text-indigo-600 hover:text-indigo-500 font-bold uppercase tracking-wider">Edit</button>
                </div>
              )}
              <p className="text-xs font-semibold text-slate-500 mt-0.5">{getBadgeName(userProfile.points)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-b border-slate-100 py-4 my-4 text-center">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Points</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{userProfile.points}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reports</p>
              <p className="text-lg font-bold text-slate-700 mt-1">{userProfile.reports}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verifies</p>
              <p className="text-lg font-bold text-slate-700 mt-1">{userProfile.verifications}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Next Rank Progress</span>
              <span className="text-slate-700">{userProfile.points}/{nextBadgePoints} PTS</span>
            </div>
            <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div style={{ width: `${progressPct}%` }} className="absolute left-0 top-0 h-full bg-indigo-600 rounded-full" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Civic Score Calculator
          </h5>
          <ul className="text-xs text-slate-500 space-y-2">
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Smart Ticket Report</span>
              <span className="font-mono font-bold text-emerald-600">+50 PTS</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-1.5">
              <span>Upvoting / Neighborhood Verify</span>
              <span className="font-mono font-bold text-emerald-600">+10 PTS</span>
            </li>
            <li className="flex justify-between pb-0.5">
              <span>Civic Comment / Community Intel</span>
              <span className="font-mono font-bold text-emerald-600">+20 PTS</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 2. Top Civic Contributors Leaderboard */}
      <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
          Top Hyperlocal Community Heroes
        </h4>

        <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
          {users.map((leader, index) => {
            const LeaderIcon = getBadgeIcon(leader.points);
            const isSelf = leader.name === userProfile.name;
            return (
              <motion.div
                key={leader.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`flex items-center justify-between py-3 ${isSelf ? "bg-indigo-50 px-3 -mx-3 rounded-xl border border-indigo-100 my-1" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center font-display font-bold text-sm text-slate-400 font-mono">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </div>
                  <div className={`p-1.5 rounded-lg border ${getBadgeColor(leader.points)}`}>
                    <LeaderIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold flex items-center gap-1.5 ${isSelf ? "text-indigo-600" : "text-slate-800"}`}>
                      {leader.name}
                      {isSelf && <span className="text-[9px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">You</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{leader.badge}</p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-6">
                  <div className="hidden sm:block text-[10px] text-slate-400 text-left">
                    <p>{leader.reportsCount} reported</p>
                    <p className="mt-0.5">{leader.verificationsCount} verified</p>
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-indigo-600">{leader.points}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider ml-1">PTS</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
