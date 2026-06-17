import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { Trophy, Clock, CheckCircle, XCircle, Check, X, AlertCircle, BookOpen } from 'lucide-react';

interface ResultProps {
  user: User;
  isAdmin: boolean;
}

export default function Result({ user, isAdmin }: ResultProps) {
  const { resultId } = useParams();
  const [result, setResult] = useState<any>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResult() {
      if (!resultId) return;
      try {
        let rData: any = null;

        if (resultId.startsWith('unattempted_')) {
          const withoutAndSplit = resultId.replace('unattempted_', '');
          const lastUnderscoreIndex = withoutAndSplit.lastIndexOf('_');
          const examId = lastUnderscoreIndex !== -1 ? withoutAndSplit.substring(0, lastUnderscoreIndex) : withoutAndSplit;
          const studentId = lastUnderscoreIndex !== -1 ? withoutAndSplit.substring(lastUnderscoreIndex + 1) : user.uid;

          if (studentId !== user.uid && !isAdmin) {
             setLoading(false);
             return; // unauthorized
          }

          // Check if payment was approved to satisfy security constraints
          const paymentDoc = await getDoc(doc(db, 'payments', `${studentId}_${examId}`));
          if (!paymentDoc.exists() || paymentDoc.data()?.status !== 'approved') {
            setLoading(false);
            return; // unauthorized or payment not approved
          }

          rData = {
            id: resultId,
            examId,
            studentId,
            score: 0,
            timeTaken: 0,
            answers: {},
            unattempted: true,
            createdAt: new Date().toISOString()
          };
        } else {
          const rDoc = await getDoc(doc(db, 'results', resultId));
          if (!rDoc.exists()) {
            setLoading(false);
            return;
          }

          rData = rDoc.data();
          if (rData.studentId !== user.uid && !isAdmin) {
             setLoading(false);
             return; // unauthorized
          }
        }

        setResult(rData);

        // Fetch Exam metadata
        const examDoc = await getDoc(doc(db, 'exams', rData.examId));
        let examData: any = null;
        if (examDoc.exists()) {
          examData = { id: examDoc.id, ...examDoc.data() };
          setExam(examData);
        }

        // Fetch Questions for detailed view reviews
        const cachedQuestionsStr = localStorage.getItem(`exam_questions_${rData.examId}`);
        const qCache = cachedQuestionsStr ? JSON.parse(cachedQuestionsStr) : null;
        
        let qList: any[] = [];
        const CACHE_EXPIRY = 12 * 60 * 60 * 1000; // 12 hours cache
        const now = new Date();
        
        let isQCacheValid = qCache && qCache.timestamp && (now.getTime() - qCache.timestamp < CACHE_EXPIRY);
        if (isQCacheValid && examData && examData.updatedAt && qCache.timestamp < examData.updatedAt) {
          isQCacheValid = false;
        }

        if (isQCacheValid) {
          qList = qCache.data;
        } else {
          const qDocs = await getDocs(query(collection(db, 'questions'), where('examId', '==', rData.examId)));
          qList = qDocs.docs.map(d => ({ id: d.id, ...d.data() }));
          localStorage.setItem(`exam_questions_${rData.examId}`, JSON.stringify({
            timestamp: now.getTime(),
            data: qList
          }));
        }

        setQuestions(qList);

        if (rData.unattempted || (examData && examData.leaderboardEnabled === false)) {
          setRank(null);
        } else {
          // Calculate Rank based on everyone who took this exam with specific tie-breakers:
          // 1. Overall Score Descending
          // 2. Biology Score Descending
          // 3. Chemistry Score Descending
          // 4. Physics Score Descending
          const CACHE_KEY = `leaderboard_${rData.examId}`;
          const CACHE_EXPIRY = 5 * 60 * 1000;
          const cachedStr = localStorage.getItem(CACHE_KEY);
          const cache = cachedStr ? JSON.parse(cachedStr) : null;
          const now = new Date().getTime();
          
          let allResults = [];
          let isLeaderboardValid = cache && cache.timestamp && (now - cache.timestamp < CACHE_EXPIRY);
          if (isLeaderboardValid && examData && examData.updatedAt && cache.timestamp < examData.updatedAt) {
            isLeaderboardValid = false;
          }

          if (isLeaderboardValid) {
            allResults = cache.data;
          } else {
            const q = query(collection(db, 'results'), where('examId', '==', rData.examId));
            const allRes = await getDocs(q);
            allResults = allRes.docs.map(d => ({ id: d.id, ...d.data() as any }));
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              timestamp: now,
              data: allResults
            }));
          }

          const scores = allResults
             .sort((a, b) => {
                if (b.score !== a.score) {
                  return b.score - a.score;
                }
                const aSub = a.subjectMarks || {};
                const bSub = b.subjectMarks || {};

                const aBio = aSub.biology || 0;
                const bBio = bSub.biology || 0;
                if (bBio !== aBio) return bBio - aBio;

                const aChem = aSub.chemistry || 0;
                const bChem = bSub.chemistry || 0;
                if (bChem !== aChem) return bChem - aChem;

                const aPhys = aSub.physics || 0;
                const bPhys = bSub.physics || 0;
                if (bPhys !== aPhys) return bPhys - aPhys;

                return 0;
             });
          
          const myRank = scores.findIndex(s => s.id === resultId) + 1;
          setRank(myRank > 0 ? myRank : null);
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [resultId, user.uid, isAdmin]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Result...</div>;
  if (!result) return <div className="p-8 text-center text-red-500 border border-red-200 rounded-lg bg-red-50 max-w-md mx-auto mt-10">Result not found or unauthorized.</div>;

  const userAnswers = result.answers || {};

  // Compute live breakdown counts
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  questions.forEach(q => {
    const selected = userAnswers[q.id];
    if (!selected) {
      unattemptedCount++;
    } else if (selected === q.correctAnswer) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const filteredQuestions = questions.filter(q => {
    const selected = userAnswers[q.id];
    if (filterTab === 'correct') return selected === q.correctAnswer;
    if (filterTab === 'incorrect') return selected && selected !== q.correctAnswer;
    if (filterTab === 'unattempted') return !selected;
    return true; // 'all'
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Detailed Performance</h1>
        <p className="text-sm text-slate-500">{exam?.title || 'Mock Exam Collection'} • Performance Analysis</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className={`px-4 py-4 text-white grid grid-cols-2 lg:grid-cols-4 gap-4 text-center ${result.unattempted ? 'bg-amber-600' : 'bg-blue-600'}`}>
          <div>
            <p className={`text-xs font-semibold mb-0.5 uppercase tracking-wider ${result.unattempted ? 'text-amber-100' : 'text-blue-200'}`}>Total Score</p>
            <p className="text-2xl font-bold">{result.score}</p>
          </div>
          <div>
            <p className={`text-xs font-semibold mb-0.5 uppercase tracking-wider ${result.unattempted ? 'text-amber-100' : 'text-blue-200'}`}>National Rank</p>
            <div className="flex justify-center items-center gap-1">
              <Trophy className={`w-4 h-4 ${result.unattempted ? 'text-amber-200' : 'text-yellow-300'}`} />
              <p className="text-2xl font-bold">{exam?.leaderboardEnabled === false ? 'Off' : rank || 'N/A'}</p>
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold mb-0.5 uppercase tracking-wider ${result.unattempted ? 'text-amber-100' : 'text-blue-200'}`}>Time Taken</p>
            <p className="text-2xl font-bold">{result.unattempted ? 'N/A' : `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`}</p>
          </div>
          <div>
            <p className={`text-xs font-semibold mb-0.5 uppercase tracking-wider ${result.unattempted ? 'text-amber-100' : 'text-blue-200'}`}>Status</p>
            {result.unattempted ? (
              <p className="text-lg font-bold text-amber-200 flex justify-center items-center gap-1 mt-0.5">
                <AlertCircle className="w-5 h-5" /> Not Attempted
              </p>
            ) : (
              <p className="text-xl font-bold text-emerald-300 flex justify-center items-center gap-1 mt-0.5">
                <CheckCircle className="w-5 h-5" /> Completed
              </p>
            )}
          </div>
        </div>

        {/* Stats grid breakdown cards */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-slate-500">Total Questions</div>
            <div className="text-base font-bold text-slate-800">{questions.length}</div>
          </div>
          <div>
            <div className="text-xs text-emerald-600 flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Correct</div>
            <div className="text-base font-bold text-emerald-600">{correctCount}</div>
          </div>
          <div>
            <div className="text-xs text-rose-600 flex items-center justify-center gap-1"><X className="w-3.5 h-3.5" /> Incorrect</div>
            <div className="text-base font-bold text-rose-600">{incorrectCount}</div>
          </div>
          <div>
            <div className="text-xs text-amber-600 flex items-center justify-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Left Blank</div>
            <div className="text-base font-bold text-amber-600">{unattemptedCount}</div>
          </div>
        </div>
      </div>

      {/* Answer & Question Review Module */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Questions & Solutions</h2>
            <p className="text-sm text-slate-500">Review selected responses and correct keys</p>
          </div>
          
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'correct', 'incorrect', 'unattempted'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                  filterTab === tab
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No questions match the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredQuestions.map((q, idx) => {
              const chosen = userAnswers[q.id];
              const isCorrect = chosen === q.correctAnswer;
              const isUnattempted = !chosen;

              // Find the original index of the question in the original questions list (1-indexed)
              const originalIndex = questions.findIndex(origQ => origQ.id === q.id) + 1;

              return (
                <div 
                  key={q.id} 
                  className={`p-6 rounded-xl border transition-shadow hover:shadow-md ${
                    isCorrect ? 'border-emerald-200 bg-emerald-50/10' :
                    isUnattempted ? 'border-amber-200 bg-amber-50/10' :
                    'border-rose-200 bg-rose-50/10'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <span className="px-2.5 py-0.5 bg-slate-150 text-slate-700 text-xs font-semibold rounded uppercase tracking-wider">
                      {q.subject || 'General'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-full">
                          <Check className="w-3 h-3" /> Correct
                        </span>
                      )}
                      {!isCorrect && !isUnattempted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-rose-800 bg-rose-100 rounded-full">
                          <X className="w-3 h-3" /> Incorrect
                        </span>
                      )}
                      {isUnattempted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold text-amber-800 bg-amber-100 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Unattempted
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-4 flex gap-2">
                    <span className="text-slate-400 font-normal">Q{originalIndex}.</span>
                    <span className="whitespace-pre-wrap leading-relaxed">{q.question}</span>
                  </h3>

                  {q.imageUrl && (
                    <div className="mb-5 relative group w-fit cursor-pointer" onClick={() => setEnlargedImage(q.imageUrl)}>
                      <img src={q.imageUrl} alt="Question Visual" className="max-w-full rounded-md shadow-sm border border-slate-200 transition-all group-hover:opacity-90" style={{ maxHeight: '300px' }} />
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                        <span className="bg-slate-900/80 text-white text-xs px-2 py-1 rounded shadow-sm backdrop-blur-sm">Click to Enlarge</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {q.options && q.options.map((opt: string, optIdx: number) => {
                      const isCorrectOption = opt === q.correctAnswer;
                      const isChosenOption = opt === chosen;

                      let borderStyle = "border-slate-200";
                      let bgStyle = "bg-white text-slate-750";
                      let indicator = null;

                      if (isCorrectOption) {
                        borderStyle = "border-emerald-500 font-semibold";
                        bgStyle = "bg-emerald-50 text-emerald-950";
                        indicator = <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded uppercase mt-2 w-fit">Correct Option</span>;
                      } else if (isChosenOption) {
                        borderStyle = "border-rose-500 font-semibold";
                        bgStyle = "bg-rose-50 text-rose-950";
                        indicator = <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded uppercase font-semibold mt-2 w-fit">Your Selection</span>;
                      }

                      return (
                        <div key={optIdx} className={`border rounded-lg p-3 flex flex-col justify-center items-start text-sm transition-all sm:py-3.5 sm:px-4 ${borderStyle} ${bgStyle}`}>
                          <div className="flex gap-2">
                            <span className="font-bold text-slate-400 mr-1">{String.fromCharCode(65 + optIdx)}.</span>
                            <span className="whitespace-pre-wrap leading-relaxed">{opt}</span>
                          </div>
                          {indicator}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
        <Link to="/leaderboard" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors font-medium">
          <Trophy className="w-5 h-5" /> View Leaderboard
        </Link>
        <Link to="/dashboard" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-750 rounded-lg transition-colors font-medium">
          Dashboard Home
        </Link>
      </div>

      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-screen-xl max-h-screen">
            <img 
              src={enlargedImage} 
              alt="Enlarged Question Visual" 
              className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              onClick={() => setEnlargedImage(null)}
              className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
