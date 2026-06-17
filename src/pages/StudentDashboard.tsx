import { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
} from "lucide-react";

interface StudentDashboardProps {
  user: User;
  isVerified?: boolean;
}

export default function StudentDashboard({ user, isVerified = true }: StudentDashboardProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [results, setResults] = useState<Record<string, any>>({});
  const [notice, setNotice] = useState<{
    isActive: boolean;
    title: string;
    noticeBody: string;
    whatsappLink: string;
    buttonText: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState<any[]>([]);
  const [selectedGuidancePhoto, setSelectedGuidancePhoto] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (location.hash === "#previous-results" && !loading) {
      setTimeout(() => {
        const element = document.getElementById("previous-results");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [location.hash, loading]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch exams
        const EXAMS_CACHE_KEY = "student_exams_cache";
        const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
        const now = new Date().getTime();
        
        let examsData: any[] = [];
        const examsCacheStr = localStorage.getItem(EXAMS_CACHE_KEY);
        const examsCache = examsCacheStr ? JSON.parse(examsCacheStr) : null;
        
        if (examsCache && examsCache.timestamp && (now - examsCache.timestamp < CACHE_EXPIRY)) {
          examsData = examsCache.data;
        } else {
          const examsQuery = query(collection(db, "exams"));
          const examsSnapshot = await getDocs(examsQuery);
          examsData = examsSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (exam) =>
                exam.id !== "whatsapp" &&
                exam.id !== "landing" &&
                exam.id !== "payment" &&
                exam.id !== "instructions",
            );
          localStorage.setItem(EXAMS_CACHE_KEY, JSON.stringify({
            timestamp: now,
            data: examsData
          }));
        }
        setExams(examsData);

        // Fetch payments for this student
        const paymentsQuery = query(
          collection(db, "payments"),
          where("studentId", "==", user.uid),
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const paymentsData: Record<string, any> = {};
        paymentsSnapshot.docs.forEach((doc) => {
          paymentsData[doc.data().examId] = { id: doc.id, ...doc.data() };
        });
        setPayments(paymentsData);

        // Fetch results for this student
        const resultsQuery = query(
          collection(db, "results"),
          where("studentId", "==", user.uid),
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsData: Record<string, any> = {};
        resultsSnapshot.docs.forEach((doc) => {
          resultsData[doc.data().examId] = { id: doc.id, ...doc.data() };
        });
        setResults(resultsData);

        // Fetch WhatsApp Settings Notice configurations
        try {
          let noticeData: any = null;
          
          const NOTICE_CACHE_KEY = "student_settings_notice";
          const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
          const noticeCacheStr = localStorage.getItem(NOTICE_CACHE_KEY);
          const noticeCache = noticeCacheStr ? JSON.parse(noticeCacheStr) : null;
          if (noticeCache && noticeCache.timestamp && (now - noticeCache.timestamp < CACHE_EXPIRY)) {
            noticeData = noticeCache.data;
          } else {
            // First attempt exams/whatsapp configuration (guaranteed to be readable & writeable)
            try {
              const docRef = doc(db, "exams", "whatsapp");
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                const data = docSnap.data();
                noticeData = {
                  isActive: data.isActive === true, // Check if explicitly turned on by admin
                  title: data.title || "CEE Mock Test Pro Notice",
                  noticeBody:
                    data.noticeBody ||
                    "Attention Students: All tournament prizes for this mock test season will be distributed exclusively through the official WhatsApp group. Click the join link to stay eligible and receive direct updates.",
                  whatsappLink: data.whatsappLink || data.link || "",
                  buttonText: data.buttonText || "Join WhatsApp Group",
                };
              }
            } catch (examsNoticeErr) {
              console.log(
                "Could not fetch notice from exams/whatsapp directly",
                examsNoticeErr,
              );
            }

            // Back fallback to settings/whatsapp
            if (!noticeData) {
              try {
                const docRef = doc(db, "settings", "whatsapp");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                  const data = docSnap.data();
                  noticeData = {
                    isActive: data.isActive !== false,
                    title:
                      data.title || "CEE Mock Test Pro Notice",
                    noticeBody:
                      data.noticeBody ||
                      "Attention Students: All tournament prizes for this mock test season will be distributed exclusively through the official WhatsApp group. Click the join link to stay eligible and receive direct updates.",
                    whatsappLink: data.link || data.whatsappLink || "",
                    buttonText: data.buttonText || "Join WhatsApp Group",
                  };
                }
              } catch (settingsErr) {
                console.log(
                  "Could not fetch settings/whatsapp fallback:",
                  settingsErr,
                );
              }
            }
            
            if (noticeData) {
              localStorage.setItem(NOTICE_CACHE_KEY, JSON.stringify({
                timestamp: now,
                data: noticeData
              }));
            }
          }

          setNotice(noticeData);

          // Fetch instructions
          let instrData: any[] = [];
          const INST_CACHE_KEY = "student_settings_instructions";
          const instCacheStr = localStorage.getItem(INST_CACHE_KEY);
          const instCache = instCacheStr ? JSON.parse(instCacheStr) : null;
          if (instCache && instCache.timestamp && (now - instCache.timestamp < CACHE_EXPIRY)) {
            instrData = instCache.data;
          } else {
            try {
              const docRef = doc(db, "exams", "instructions");
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                instrData = docSnap.data().steps || [];
              } else {
                // try settings
                const setRef = doc(db, "settings", "instructions");
                const setSnap = await getDoc(setRef);
                if (setSnap.exists()) {
                  instrData = setSnap.data().steps || [];
                }
              }
              localStorage.setItem(INST_CACHE_KEY, JSON.stringify({
                timestamp: now,
                data: instrData
              }));
            } catch (e) {
              console.warn("Could not load exam instructions:", e);
            }
          }
          setInstructions(instrData);
        } catch (err) {
          console.error(
            "Failed to fetch WhatsApp link settings through both endpoints",
            err,
          );
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading dashboard...</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 border-b border-gray-200 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your mock exams and view results
          </p>
        </div>
        <Link
          to="/instructions"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 border border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 text-sm font-bold rounded-2xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <BookOpen className="w-4 h-4 shrink-0 text-blue-600 animate-pulse" />
          <span>How to Use This Site Properly</span>
        </Link>
      </div>

      <div className="space-y-8">
        {/* Verification Notice Banner */}
        {!isVerified && (
          <div className="bg-amber-50 border-2 border-amber-200 text-amber-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-600" />
              <div>
                <h4 className="font-bold text-sm">Account not verified</h4>
                <p className="text-xs mt-0.5">Please check your email (and spam/junk folder) for the verification link. You must verify your account to access exams.</p>
              </div>
            </div>
            <Link to="/profile" className="whitespace-nowrap px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow transition-colors">
              Go to Profile
            </Link>
          </div>
        )}

        {/* WhatsApp Tournament Notice Banner */}
        {notice && notice.isActive && notice.whatsappLink && (
          <div className="bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-teal-50/50 border-2 border-emerald-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-emerald-500/50">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/15 mt-0.5 animate-pulse">
                <MessageSquare className="w-5.5 h-5.5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight">
                  Notice
                </h4>
                <p className="text-slate-650 text-xs sm:text-sm mt-1 leading-relaxed max-w-xl">
                  {notice.noticeBody}
                </p>
              </div>
            </div>
            <a
              href={notice.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:-translate-y-0.5 transition-all text-center shrink-0 cursor-pointer font-semibold"
            >
              {notice.buttonText || "Join WhatsApp Group"}
            </a>
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Live & Upcoming Exams
          </h2>

          {(() => {
            const activeAll = exams.filter(
              (exam) =>
                exam.isActive &&
                !exam.isPermanentlyDeactivated &&
                !results[exam.id] &&
                !(exam.endTime && currentTime > new Date(exam.endTime)),
            );
            const paidActiveExams = activeAll.filter(
              (exam) => exam.isPaid !== false,
            );
            const freeActiveExams = activeAll.filter(
              (exam) => exam.isPaid === false,
            );

            if (activeAll.length === 0) {
              return (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-150 text-center">
                  <p className="text-gray-500 text-sm">
                    No active exams available at the moment.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-8">
                {/* Paid Exams Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2 bg-slate-100/60 p-2 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Paid Mock Exams
                  </h3>
                  {paidActiveExams.length === 0 ? (
                    <div className="bg-white p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No active paid exams available at this time.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                      {paidActiveExams.map((exam) => {
                        const payment = payments[exam.id];
                        const hasStarted =
                          !exam.startTime ||
                          currentTime >= new Date(exam.startTime);
                        const hasEnded =
                          exam.endTime && currentTime > new Date(exam.endTime);

                        // If there is a starting time, payment locks automatically starting 10 minutes before the exams starts
                        const isPaymentLocked = false;

                        return (
                          <div
                            key={exam.id}
                            className="p-3 sm:py-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-7 h-7 bg-blue-55 text-blue-600 rounded flex items-center justify-center shrink-0">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 truncate">
                                  {exam.title}
                                </h3>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-750 border border-blue-100">
                                  {exam.duration} Min
                                </span>
                                <span className="text-xs text-slate-500 font-normal">
                                  {exam.totalQuestions} Questions • Rs.{" "}
                                  {exam.price}
                                </span>
                              </div>

                              {(exam.startTime || exam.endTime) && (
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 pl-9">
                                  {exam.startTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>
                                        Starts:{" "}
                                        {new Date(
                                          exam.startTime,
                                        ).toLocaleString()}
                                      </span>
                                    </span>
                                  )}
                                  {exam.endTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>
                                        Ends:{" "}
                                        {new Date(
                                          exam.endTime,
                                        ).toLocaleString()}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 shrink-0 sm:flex-nowrap pl-9 md:pl-0">
                              {/* Status Display badge */}
                              <div>
                                {payment ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      payment.status === "approved"
                                        ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                                        : payment.status === "rejected"
                                          ? "text-rose-700 bg-rose-50 border border-rose-100"
                                          : "text-amber-700 bg-amber-50 border border-amber-100"
                                    }`}
                                  >
                                    {payment.status === "approved" ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : payment.status === "rejected" ? (
                                      <AlertCircle className="w-3 h-3" />
                                    ) : (
                                      <Clock className="w-3 h-3" />
                                    )}
                                    Payment{" "}
                                    {payment.status.charAt(0).toUpperCase() +
                                      payment.status.slice(1)}
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${isPaymentLocked ? 'text-rose-700 bg-rose-55 border border-rose-100' : 'text-slate-600 bg-slate-50 border border-slate-200'}`}>
                                    {isPaymentLocked ? "Locked" : "Payment Required"}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-[100px] text-right">
                                {payment && payment.status === "approved" ? (
                                  hasEnded ? (
                                    <button
                                      disabled
                                      className="w-full px-3 py-1.5 border border-transparent text-[11px] font-bold rounded text-white bg-slate-400 cursor-not-allowed text-center"
                                    >
                                      Exam Ended
                                    </button>
                                  ) : !hasStarted ? (
                                    <button
                                      disabled
                                      className="w-full px-3 py-1.5 border border-transparent text-[11px] font-bold rounded text-white bg-slate-400 cursor-not-allowed text-center"
                                    >
                                      Starts Soon
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        navigate(`/exam/${exam.id}`)
                                      }
                                      disabled={!isVerified}
                                      className={`w-full px-3 py-1.5 border border-transparent text-[11px] font-bold rounded text-white shadow-sm transition-all text-center ${!isVerified ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                      {!isVerified ? 'Verify First' : 'Start Exam'}
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() =>
                                      navigate(`/payment/${exam.id}`)
                                    }
                                    disabled={
                                      (payment &&
                                        payment.status === "pending") ||
                                      hasEnded ||
                                      !isVerified ||
                                      isPaymentLocked
                                    }
                                    className={`w-full px-2.5 py-1.5 border border-transparent text-[11px] font-bold rounded text-white shadow-sm transition-all whitespace-nowrap text-center ${isPaymentLocked ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-85' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'} disabled:cursor-not-allowed`}
                                  >
                                    {hasEnded
                                      ? "Exam Ended"
                                      : isPaymentLocked
                                        ? "Locked"
                                        : !isVerified
                                          ? "Verify Required"
                                          : payment && payment.status === "pending"
                                            ? "Pending"
                                            : payment &&
                                                payment.status === "rejected"
                                              ? "Retry"
                                              : "Buy Exam"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Unpaid (Free) Exams Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-2 bg-slate-100/60 p-2 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Unpaid (Free) Practice Exams
                  </h3>
                  {freeActiveExams.length === 0 ? (
                    <div className="bg-white p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No active free practice exams available at this time.
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                      {freeActiveExams.map((exam) => {
                        const hasStarted =
                          !exam.startTime ||
                          currentTime >= new Date(exam.startTime);
                        const hasEnded =
                          exam.endTime && currentTime > new Date(exam.endTime);

                        return (
                          <div
                            key={exam.id}
                            className="p-3 sm:py-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-7 h-7 bg-emerald-55 text-emerald-600 rounded flex items-center justify-center shrink-0">
                                  <BookOpen className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800 truncate">
                                  {exam.title}
                                </h3>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-750 border border-emerald-100">
                                  {exam.duration} Min
                                </span>
                                <span className="text-xs text-slate-500 font-normal">
                                  {exam.totalQuestions} Questions • Free
                                  Practice
                                </span>
                              </div>

                              {(exam.startTime || exam.endTime) && (
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 pl-9">
                                  {exam.startTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>
                                        Starts:{" "}
                                        {new Date(
                                          exam.startTime,
                                        ).toLocaleString()}
                                      </span>
                                    </span>
                                  )}
                                  {exam.endTime && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>
                                        Ends:{" "}
                                        {new Date(
                                          exam.endTime,
                                        ).toLocaleString()}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 shrink-0 sm:flex-nowrap pl-9 md:pl-0">
                              <div>
                                <span className="inline-flex items-center shrink-0 gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200">
                                  Free Access
                                </span>
                              </div>

                              <div className="min-w-[100px] text-right">
                                {hasEnded ? (
                                  <button
                                    disabled
                                    className="w-full px-3 py-1.5 border border-transparent text-[11px] font-bold rounded text-white bg-slate-400 cursor-not-allowed text-center"
                                  >
                                    Exam Ended
                                  </button>
                                ) : !hasStarted ? (
                                  <button
                                    disabled
                                    className="w-full px-3 py-1.5 border border-transparent text-[11px] font-bold rounded text-white bg-slate-400 cursor-not-allowed text-center"
                                  >
                                    Starts Soon
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/exam/${exam.id}`)}
                                    disabled={!isVerified}
                                    className={`w-full px-3 py-1.5 border border-transparent text-[11px] font-bold rounded text-white shadow-sm transition-all text-center ${!isVerified ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                  >
                                    {!isVerified ? 'Verify First' : 'Start Exam'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </section>

        <section id="previous-results">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            My Previous Results
          </h2>

          {(() => {
            const previousResultExams = exams.filter((exam) => {
              if (results[exam.id]) return true;

              const payment = payments[exam.id];
              const isApproved = payment && payment.status === "approved";
              const hasEnded =
                exam.endTime && currentTime > new Date(exam.endTime);
              const isInactive =
                !exam.isActive || exam.isPermanentlyDeactivated;
              return isApproved && (hasEnded || isInactive);
            });

            if (previousResultExams.length === 0) {
              return (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-150 text-center">
                  <p className="text-gray-500 text-sm">
                    You haven't completed any exams yet.
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
                {previousResultExams.map((exam) => {
                  const result = results[exam.id] || {
                    id: `unattempted_${exam.id}_${user.uid}`,
                    score: 0,
                    timeTaken: 0,
                    answers: {},
                    unattempted: true,
                  };

                  return (
                    <div
                      key={exam.id}
                      className="p-3 sm:py-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {result.unattempted ? (
                            <div className="w-7 h-7 bg-amber-50 rounded flex items-center justify-center text-amber-600 shrink-0">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 bg-emerald-50 rounded flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 truncate">
                              {exam.title}
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              {result.unattempted
                                ? "Mock Exam - Expired (Not Attempted)"
                                : "Mock Exam Attempt Completed"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right min-w-[60px]">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                            Score
                          </span>
                          <span
                            className={`text-base font-extrabold ${result.unattempted ? "text-amber-600" : "text-emerald-600"}`}
                          >
                            {result.score}
                          </span>
                        </div>

                        <Link
                          to={`/result/${result.id}`}
                          className="inline-flex justify-center items-center px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm"
                        >
                          View Full Result
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      </div>

      {/* Zoom guidance photo lightbox */}
      {selectedGuidancePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm shadow-2xl"
          onClick={() => setSelectedGuidancePhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full p-4 md:p-6 shadow-2xl relative border border-slate-205 flex flex-col gap-4 max-h-[95vh] overflow-y-auto animate-in fade-in duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Detailed Guidance View
                </h3>
                <p className="text-[11px] text-slate-400">Step reference illustration</p>
              </div>
              <button
                onClick={() => setSelectedGuidancePhoto(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors font-bold text-xs"
              >
                Close
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 max-h-[72vh] flex items-center justify-center">
              <img
                src={selectedGuidancePhoto}
                alt="Guidance Detailed Zoom"
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

