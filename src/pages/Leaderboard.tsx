import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  Trophy,
  Medal,
  Award,
  Sparkles,
  UserCheck,
  Search,
} from "lucide-react";
import { User } from "firebase/auth";

interface LeaderboardProps {
  user: User | null;
}

export default function Leaderboard({ user }: LeaderboardProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchExams() {
      const q = query(collection(db, "exams"));
      const snapshot = await getDocs(q);
      const eData = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as any)
        .filter(
          (exam) =>
            exam.id !== "whatsapp" &&
            exam.id !== "landing" &&
            exam.id !== "payment" &&
            exam.id !== "instructions" &&
            exam.leaderboardEnabled !== false,
        );
      setExams(eData);
      if (eData.length > 0) {
        setSelectedExam(eData[0].id);
      } else {
        setLoading(false);
      }
    }
    fetchExams();
  }, []);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!selectedExam) return;
      setLoading(true);
      try {
        const CACHE_KEY = `leaderboard_${selectedExam}`;
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes cache
        
        const cachedStr = localStorage.getItem(CACHE_KEY);
        const cache = cachedStr ? JSON.parse(cachedStr) : null;
        const now = new Date().getTime();
        
        let results = [];
        
        const currentExamObj = exams.find(e => e.id === selectedExam);
        
        let isCacheValid = cache && cache.timestamp && (now - cache.timestamp < CACHE_EXPIRY);
        if (isCacheValid && currentExamObj && currentExamObj.updatedAt && cache.timestamp < currentExamObj.updatedAt) {
          isCacheValid = false;
        }

        if (isCacheValid) {
          results = cache.data;
        } else {
          const q = query(
            collection(db, "results"),
            where("examId", "==", selectedExam),
          );
          const snapshot = await getDocs(q);
          results = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          }));
          
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: now,
            data: results
          }));
        }

        // Sort client-side:
        // 1. Overall Score Descending
        // 2. Biology Score Descending
        // 3. Chemistry Score Descending
        // 4. Physics Score Descending
        results.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }

          const aSub = a.subjectMarks || {};
          const bSub = b.subjectMarks || {};

          // Tie-breaker 1: Biology
          const aBio = aSub.biology || 0;
          const bBio = bSub.biology || 0;
          if (bBio !== aBio) {
            return bBio - aBio;
          }

          // Tie-breaker 2: Chemistry
          const aChem = aSub.chemistry || 0;
          const bChem = bSub.chemistry || 0;
          if (bChem !== aChem) {
            return bChem - aChem;
          }

          // Tie-breaker 3: Physics
          const aPhys = aSub.physics || 0;
          const bPhys = bSub.physics || 0;
          if (bPhys !== aPhys) {
            return bPhys - aPhys;
          }

          return 0; // Complete tie, maintain relative order
        });

        setLeaderboard(results);
      } catch (err) {
        console.error("Error fetching leaderboard", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [selectedExam]);

  const myEntry = user
    ? leaderboard.find((r) => r.studentId === user.uid)
    : null;
  const myRankIndex = user
    ? leaderboard.findIndex((r) => r.studentId === user.uid)
    : -1;
  const myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

  const filteredLeaderboard = leaderboard.filter((res) =>
    (res.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          National Leaderboard
        </h1>
        <p className="mt-4 text-lg text-slate-500">
          Live rankings of all participants across Nepal
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        {exams.length === 0 && !loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold">
              No Leaderboards Available
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Leaderboards for exams have been disabled by the administrator or
              no exams exist yet.
            </p>
          </div>
        ) : (
          <>
            {/* Exam Selection & Live search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                <label className="font-semibold text-slate-700 whitespace-nowrap text-sm">
                  Exam:
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name..."
                  className="w-full bg-transparent border-0 text-slate-900 text-sm focus:ring-0 focus:outline-none p-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Personalized Student Rank Section */}
            {user && !loading && myRank && myEntry && (
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md border border-blue-500 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-sm shadow-inner shrink-0">
                    <Award className="w-8 h-8 text-yellow-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <span className="text-xs font-bold uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded backdrop-blur-sm">
                        Your Standing
                      </span>
                      <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold mt-1">
                      Hello, {myEntry.studentName}!
                    </h2>
                    <p className="text-sm text-blue-100 mt-0.5">
                      Tiebreaker ranks are computed automatically across all
                      registered mock exams.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 text-center shrink-0">
                  <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-md min-w-24">
                    <p className="text-xs text-blue-200 font-medium tracking-wide">
                      Rank
                    </p>
                    <p className="text-2xl font-black text-yellow-300">
                      #{myRank}
                    </p>
                  </div>
                  <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 backdrop-blur-md min-w-24">
                    <p className="text-xs text-blue-200 font-medium tracking-wide">
                      Score
                    </p>
                    <p className="text-2xl font-black">{myEntry.score}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-slate-500">
                Loading rankings...
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                {filteredLeaderboard.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    {searchQuery
                      ? "No matching students found."
                      : "No results published for this exam yet."}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-24"
                        >
                          Rank
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"
                        >
                          Student Name
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"
                        >
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {filteredLeaderboard.map((res, index) => {
                        const originalRank =
                          leaderboard.findIndex((item) => item.id === res.id) +
                          1;
                        const isCurrentUser =
                          user && res.studentId === user.uid;

                        return (
                          <tr
                            key={res.id}
                            className={`transition-colors ${
                              isCurrentUser
                                ? "bg-blue-50/70 border-l-4 border-blue-600 font-medium"
                                : originalRank === 1
                                  ? "bg-yellow-50/40"
                                  : originalRank === 2
                                    ? "bg-slate-50/40"
                                    : originalRank === 3
                                      ? "bg-amber-50/40"
                                      : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              {originalRank === 1 ? (
                                <Medal className="w-6 h-6 text-yellow-500" />
                              ) : originalRank === 2 ? (
                                <Medal className="w-6 h-6 text-slate-400" />
                              ) : originalRank === 3 ? (
                                <Medal className="w-6 h-6 text-amber-700" />
                              ) : (
                                <span className="font-semibold text-slate-500 ml-1">
                                  {originalRank}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold ${originalRank <= 3 ? "text-slate-900 text-base" : "text-slate-700"}`}
                                >
                                  {res.studentName}
                                </span>
                                {isCurrentUser && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                                    <UserCheck className="w-3 h-3" /> You
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${originalRank <= 3 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"}`}
                              >
                                {res.score}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

