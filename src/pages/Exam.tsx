import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';
import { Clock, AlertTriangle } from 'lucide-react';

interface ExamProps {
  user: User;
}

export default function Exam({ user }: ExamProps) {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [examAlertMsg, setExamAlertMsg] = useState<string | null>(null);
  const [showViolationMsg, setShowViolationMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function initExam() {
      if (!examId) return;

      try {
        // 1. Check if already submitted
        const resultDoc = await getDoc(doc(db, 'results', `${user.uid}_${examId}`));
        if (resultDoc.exists()) {
          navigate(`/result/${user.uid}_${examId}`);
          return;
        }

        // 2. Fetch Exam & Questions
        const examDoc = await getDoc(doc(db, 'exams', examId));
        if (!examDoc.exists()) {
          setExamAlertMsg("Exam not found.");
          return;
        }
        const examData: any = { id: examDoc.id, ...examDoc.data() };

        // Check Payment only if exam is paid
        if (examData.isPaid !== false) {
          const paymentDoc = await getDoc(doc(db, 'payments', `${user.uid}_${examId}`));
          if (!paymentDoc.exists() || paymentDoc.data().status !== 'approved') {
            setExamAlertMsg("You must purchase and have an approved transaction to start this exam.");
            return;
          }
        }
        
        const now = new Date();
        if (examData.startTime && now < new Date(examData.startTime)) {
          setExamAlertMsg("This exam has not started yet.");
          return;
        }
        if (examData.endTime && now > new Date(examData.endTime)) {
          setExamAlertMsg("This exam has already ended.");
          return;
        }

        setExam(examData);
        
        // Calculate remaining time (student always receives the full duration configured on the exam/question paper)
        let durationSeconds = examData.duration * 60;
        setTimeLeft(durationSeconds);

        const qSnapshot = await getDocs(query(collection(db, 'questions'), where('examId', '==', examId)));
        // if no questions, maybe mock something
        if (qSnapshot.empty) {
          setExamAlertMsg("Exam has no questions yet. Contact Admin.");
          return;
        }

        const qData: any[] = qSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Fisher-Yates Shuffle helper to randomize questions within each subject
        const shuffleArray = (array: any[]) => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        const normalizeSubject = (sub: string) => {
          const norm = (sub || '').toLowerCase().trim();
          if (norm === 'zoology') return 'zoology';
          if (norm === 'botany') return 'botany';
          if (norm === 'chemistry' || norm === 'chem') return 'chemistry';
          if (norm === 'physics' || norm === 'phys') return 'physics';
          if (norm === 'mat') return 'mat';
          return norm;
        };

        // Group questions by subject
        const groups: Record<string, any[]> = {};
        qData.forEach(q => {
          const sub = normalizeSubject(q.subject);
          if (!groups[sub]) {
            groups[sub] = [];
          }
          groups[sub].push(q);
        });

        // Shuffle questions within each subject group
        Object.keys(groups).forEach(sub => {
          groups[sub] = shuffleArray(groups[sub]);
        });

        // Predefined subject order (Zoology -> Botany -> Chemistry -> Physics -> MAT)
        const SUBJECT_ORDER = ['zoology', 'botany', 'chemistry', 'physics', 'mat'];

        const orderedQuestions: any[] = [];
        // Add predefined subjects in correct sequence
        SUBJECT_ORDER.forEach(sub => {
          if (groups[sub]) {
            orderedQuestions.push(...groups[sub]);
          }
        });

        // Add any other subjects that were not predefined, for safety/robustness
        Object.keys(groups).forEach(sub => {
          if (!SUBJECT_ORDER.includes(sub)) {
            orderedQuestions.push(...groups[sub]);
          }
        });

        setQuestions(orderedQuestions);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setExamAlertMsg(`Error initializing exam: ${err.message}`);
      }
    }
    initExam();
  }, [examId, user.uid, navigate]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSubmitAndLock(); // auto submit on tab change immediately
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setViolationCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
             handleSubmitAndLock(); // auto submit on 3rd violation
          } else {
             setShowViolationMsg(`Warning: You exited fullscreen! (${newCount}/3 violations). The exam will auto-submit on 3rd violation.`);
          }
          return newCount;
        });
      }
    };
    
    // Prevent context menu
    const handleContextMenu = (e: Event) => e.preventDefault();

    // Prevent common shortcuts (PrintScreen, Copy, Save, Print)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        navigator.clipboard.writeText(''); // Clear clipboard as a deterrent
        setShowViolationMsg("Screenshots are strictly prohibited during the exam.");
      }
      
      // Prevent Ctrl/Cmd + C, P, S, etc.
      if ((e.ctrlKey || e.metaKey) && ['c', 'p', 's', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    if (!loading && !isSubmitting && examStarted) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeyDown);

      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
        setShowConfirmModal(true);
      };
      
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      
      window.addEventListener("popstate", handlePopState);
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [loading, isSubmitting, examStarted, timeLeft, questions, answers, exam, examId]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || isSubmitting || !examStarted) return;
    if (timeLeft <= 0) {
      handleSubmitAndLock();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting, examStarted]);

  const handleOptionSelect = (qId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const scrollToQuestion = (idx: number) => {
    const element = document.getElementById(`q-${idx}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmitAndLock = async () => {
    setIsSubmitting(true);
    let correct = 0;
    let wrong = 0;
    const unattempted = questions.length - Object.keys(answers).length;

    const subjectMarks: Record<string, number> = {
      biology: 0,
      chemistry: 0,
      physics: 0,
      zoology: 0,
      botany: 0,
      mat: 0
    };

    questions.forEach(q => {
      const ans = answers[q.id];
      const subj = (q.subject || '').toLowerCase().trim();
      let scoreDelta = 0;
      if (ans) {
        if (ans === q.correctAnswer) {
          correct += 1;
          scoreDelta = 1;
        } else {
          wrong += 1;
          scoreDelta = -0.25;
        }
      }

      if (subj === 'zoology' || subj === 'botany' || subj === 'biology') {
        subjectMarks.biology += scoreDelta;
        if (subj === 'zoology') subjectMarks.zoology += scoreDelta;
        else if (subj === 'botany') subjectMarks.botany += scoreDelta;
      } else if (subj === 'chemistry' || subj === 'chem') {
        subjectMarks.chemistry += scoreDelta;
      } else if (subj === 'physics' || subj === 'phys') {
        subjectMarks.physics += scoreDelta;
      } else if (subj === 'mat') {
        subjectMarks.mat += scoreDelta;
      }
    });

    const score = correct - (wrong * 0.25);
    const timeTaken = exam.duration * 60 - (timeLeft || 0);
    
    // fetch user name
    let studentName = user.email || 'Student';
    try {
      const uDoc = await getDoc(doc(db, 'users', user.uid));
      if (uDoc.exists() && uDoc.data().name) {
         studentName = uDoc.data().name;
      }
    } catch (e) {}

    const resultData = {
      studentId: user.uid,
      examId: examId as string,
      score: isNaN(score) ? 0 : Number(score),
      timeTaken: isNaN(timeTaken) ? 0 : Number(timeTaken),
      studentName: String(studentName).substring(0, 95),
      subjectMarks: subjectMarks,
      answers: answers
    };

    try {
      await setDoc(doc(db, 'results', `${user.uid}_${examId}`), resultData);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(()=>{});
      }
      navigate(`/result/${user.uid}_${examId}`);
    } catch (err) {
      console.error("Failed to save result", err);
      setIsSubmitting(false);
      setSubmitErrorMsg("Failed to save your answers. Please check connection.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading Secure Exam Environment...</div>;

  if (!examStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{exam?.title}</h1>
        <p className="text-slate-600 max-w-md mb-8">
          This exam requires a secure, fullscreen environment. Please ensure you have a stable connection. Do not switch tabs or windows, as doing so multiple times will result in auto-submission and termination of your exam.
        </p>
        <button 
          onClick={() => {
            const el = document.documentElement;
            if (el.requestFullscreen) {
               el.requestFullscreen().catch((err) => console.log('Fullscreen blocked', err));
            }
            setExamStarted(true);
          }}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
        >
          Enter Fullscreen & Begin
        </button>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative select-none">
      {/* Exam Header */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 px-3 py-2.5 sm:px-6 sm:py-4 flex justify-between items-center gap-2 shadow-md">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-xl font-bold truncate pr-1" title={exam.title}>{exam.title}</h1>
          <p className="text-[10px] sm:text-sm text-slate-400 select-none">
            <span className="sm:hidden">Q: {questions.length} • -0.25</span>
            <span className="hidden sm:inline">Total Questions: {questions.length} | Negative Marking: -0.25</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          {violationCount > 0 && (
            <div className="flex items-center text-amber-500 gap-1 text-[10px] sm:text-sm font-medium bg-amber-500/10 px-1.5 py-1.5 sm:px-3 sm:py-1.5 rounded border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
              <span>V: {violationCount}/3</span>
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-xl font-mono text-emerald-400 bg-slate-800 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-slate-700 shrink-0">
             <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
             <span>{formatTime(timeLeft || 0)}</span>
          </div>
          <button 
            disabled={isSubmitting}
            onClick={() => setShowConfirmModal(true)}
            className="px-2.5 py-1.5 sm:px-6 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            {isSubmitting ? '...' : (
              <>
                <span className="sm:hidden">Submit</span>
                <span className="hidden sm:inline">Submit Exam</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Submit Exam?</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to completely finish and submit your exam? You cannot undo this action.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSubmitAndLock();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Sidebar Page Layout */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 pb-40">
        
        {/* Left Side Menu (Desktop/Tablets only) */}
        <div className="hidden md:block w-64 lg:w-72 shrink-0">
          <div className="sticky top-24 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                Total: {questions.length}
              </span>
            </h3>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] pb-3 border-b border-slate-100 font-medium">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300 block"></span>
                <span>Unanswered</span>
              </div>
            </div>

            {/* Palette Buttons Grid */}
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, index) => {
                const isAnswered = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(index)}
                    className={`h-9 w-9 text-xs font-bold rounded-lg transition-all flex items-center justify-center shrink-0 border cursor-pointer ${
                      isAnswered
                        ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Questions Listing */}
        <div className="flex-1 space-y-8 md:max-w-4xl">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200" id={`q-${index}`}>
              <div className="flex gap-4 items-start">
                <span className="w-8 h-8 flex-shrink-0 bg-blue-100 text-blue-800 font-bold rounded-lg flex items-center justify-center">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <span className="inline-block px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 mb-3 block w-fit">
                    {q.subject}
                  </span>
                  <p className="text-lg text-slate-800 font-medium whitespace-pre-wrap">{q.question}</p>
                  <div className="mt-5 space-y-3">
                    {q.options.map((opt: string, optIdx: number) => (
                      <label 
                        key={optIdx} 
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <input 
                          type="radio" 
                          name={q.id}
                          checked={answers[q.id] === opt} 
                          onChange={() => handleOptionSelect(q.id, opt)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 shrink-0"
                        />
                        <span className="ml-3 text-slate-700 block whitespace-pre-wrap text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Questions Palette Tracker Footer */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-3 sm:p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-50">
        <div className="max-w-7xl mx-auto space-y-3">
          
          {/* Horizontally scrolling list of question buttons for mobile only */}
          <div className="md:hidden">
            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 px-0.5">Jump to Question:</p>
            <div className="flex overflow-x-auto gap-2 pb-1.5 scrollbar-thin">
              {questions.map((q, index) => {
                const isAnswered = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(index)}
                    className={`w-9 h-9 text-xs font-bold rounded-lg transition-all flex items-center justify-center shrink-0 border cursor-pointer ${
                      isAnswered
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-50 border-slate-250 text-slate-700'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center text-xs sm:text-sm">
            <div className="flex gap-4 sm:gap-6 font-semibold">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                <span>Attempted: <span className="text-blue-600 font-bold">{Object.keys(answers).length}</span></span>
              </span>
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 inline-block border border-slate-300"></span>
                <span>Unattempted: <span className="text-amber-600 font-bold">{questions.length - Object.keys(answers).length}</span></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {examAlertMsg && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Notice</h3>
            <p className="text-slate-600 mb-6">{examAlertMsg}</p>
            <button 
              onClick={() => {
                setExamAlertMsg(null);
                navigate('/dashboard');
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {showViolationMsg && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm border-t-4 border-amber-500">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-slate-900">Warning!</h3>
            </div>
            <p className="text-slate-600 mb-6">{showViolationMsg}</p>
            <button 
              onClick={() => {
                setShowViolationMsg(null);
                const el = document.documentElement;
                if (el.requestFullscreen) {
                  el.requestFullscreen().catch(() => {});
                }
              }}
              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {submitErrorMsg && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm border-t-4 border-red-500">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Submission Error</h3>
            <p className="text-slate-600 mb-6">{submitErrorMsg}</p>
            <button 
              onClick={() => setSubmitErrorMsg(null)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
