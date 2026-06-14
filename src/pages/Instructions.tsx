import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  CreditCard, 
  UserCheck, 
  GraduationCap, 
  ZoomIn, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  MessageSquare
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Instructions() {
  const [instructions, setInstructions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchInstructions() {
      try {
        let instrData: any[] = [];
        const docRef = doc(db, "exams", "instructions");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          instrData = docSnap.data().steps || [];
        } else {
          const setRef = doc(db, "settings", "instructions");
          const setSnap = await getDoc(setRef);
          if (setSnap.exists()) {
            instrData = setSnap.data().steps || [];
          }
        }
        setInstructions(instrData);
      } catch (err) {
        console.error("Failed to load instructions:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInstructions();
  }, []);

  // Standard interactive fallback steps if nothing is fetched yet
  const defaultSteps = [
    {
      id: "verify",
      title: "1. Update Student ID & Verify Email",
      description: "Ensure you enter a valid Student ID inside 'My Account' or the registration panel. Verify your registered email address using the confirmation link sent to your inbox. This helps us sync and secure your mock result records.",
      category: "account",
      icon: <UserCheck className="w-5 h-5 text-blue-600" />
    },
    {
      id: "pay",
      title: "2. Secure Payment & Attach Screenshot",
      description: "Navigate to the exam and select 'Unlock/Pay'. Pay the amount requested via eSewa or other matching payment channels. Carefully upload a clear screenshot of the payment receipt so our administrators can verify and approve your registration.",
      category: "payment",
      icon: <CreditCard className="w-5 h-5 text-indigo-600" />
    },
    {
      id: "exam",
      title: "3. Sit & Submit Your Online Exam",
      description: "Once your payment is approved, your exam unlocks. Ensure you have a stable network. Do not refresh or exit the exam tab once started. Carefully answer all questions and hit 'Submit' before the timer drains to save your scorecard.",
      category: "exam",
      icon: <GraduationCap className="w-5 h-5 text-emerald-600" />
    }
  ];

  const stepsToDisplay = instructions.length > 0 ? instructions : defaultSteps;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Back navigation & header */}
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 uppercase tracking-wider mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <BookOpen className="w-8 h-8 text-blue-600 shrink-0" />
                How to Use This Site Properly
              </h1>
              <p className="text-slate-500 mt-1.5 text-sm max-w-2xl leading-relaxed">
                Welcome to CEE Mock Test Pro! Read these step-by-step instructions to properly verify your student rank records, make easy mock test payments, and complete live mock exams successfully.
              </p>
            </div>
            
            {/* Quick guide badge */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shrink-0 flex items-center gap-3 shadow-xs">
              <ShieldCheck className="w-10 h-10 text-rose-500" />
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Double Check</span>
                <span className="text-xs font-bold text-slate-800">Support is always active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Category Cards Selector */}
        <div className="mb-10">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
            Help Categories — Choose one to view instructions
          </span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveFilter("all")}
              className={`text-left p-5 rounded-3xl border transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                activeFilter === "all"
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/15"
                  : "bg-white border-slate-200 hover:border-blue-450 hover:bg-slate-50/50 text-slate-800"
              }`}
            >
              <div className={`p-3 rounded-2xl w-fit ${
                activeFilter === "all" ? "bg-white/10 text-white border border-white/20" : "bg-blue-50 text-blue-600 border border-blue-105"
              }`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="font-extrabold text-sm tracking-tight text-current">All Step Guidelines</h3>
                <p className={`text-[11px] mt-0.5 leading-snug ${
                  activeFilter === "all" ? "text-blue-100" : "text-slate-400"
                }`}>
                  Complete general walkthrough
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveFilter("account")}
              className={`text-left p-5 rounded-3xl border transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                activeFilter === "account"
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/15"
                  : "bg-white border-slate-200 hover:border-blue-450 hover:bg-slate-50/50 text-slate-800"
              }`}
            >
              <div className={`p-3 rounded-2xl w-fit ${
                activeFilter === "account" ? "bg-white/10 text-white border border-white/20" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="font-extrabold text-sm tracking-tight text-current">Verification & ID</h3>
                <p className={`text-[11px] mt-0.5 leading-snug ${
                  activeFilter === "account" ? "text-blue-100" : "text-slate-400"
                }`}>
                  Setup and match Student ID
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveFilter("payment")}
              className={`text-left p-5 rounded-3xl border transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                activeFilter === "payment"
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/15"
                  : "bg-white border-slate-200 hover:border-blue-450 hover:bg-slate-50/50 text-slate-800"
              }`}
            >
              <div className={`p-3 rounded-2xl w-fit ${
                activeFilter === "payment" ? "bg-white/10 text-white border border-white/20" : "bg-emerald-50 text-emerald-600 border border-emerald-110"
              }`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="font-extrabold text-sm tracking-tight text-current">Payments & eSewa</h3>
                <p className={`text-[11px] mt-0.5 leading-snug ${
                  activeFilter === "payment" ? "text-blue-100" : "text-slate-400"
                }`}>
                  Submit, attach and unlock
                </p>
              </div>
            </button>

            <button
              onClick={() => setActiveFilter("exam")}
              className={`text-left p-5 rounded-3xl border transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                activeFilter === "exam"
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/15"
                  : "bg-white border-slate-200 hover:border-blue-450 hover:bg-slate-50/50 text-slate-800"
              }`}
            >
              <div className={`p-3 rounded-2xl w-fit ${
                activeFilter === "exam" ? "bg-white/10 text-white border border-white/20" : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <h3 className="font-extrabold text-sm tracking-tight text-current">Mock Exam Protocol</h3>
                <p className={`text-[11px] mt-0.5 leading-snug ${
                  activeFilter === "exam" ? "text-blue-100" : "text-slate-400"
                }`}>
                  Test rules & submission
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Content body - instructions cards */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white p-20 rounded-3xl border border-slate-200 text-center text-blue-600 font-bold text-sm">
              Loading guidelines steps...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stepsToDisplay
                .filter(s => {
                  const category = s.category ? s.category.toLowerCase() : "";
                  if (activeFilter === "all") return true;
                  if (activeFilter === "account") {
                    return category === "account" || (s.title && s.title.toLowerCase().includes("id")) || (s.title && s.title.toLowerCase().includes("verify"));
                  }
                  if (activeFilter === "payment") {
                    return category === "payment" || (s.title && s.title.toLowerCase().includes("pay")) || (s.title && s.title.toLowerCase().includes("screenshot")) || (s.title && s.title.toLowerCase().includes("esewa"));
                  }
                  if (activeFilter === "exam") {
                    return category === "exam" || (s.title && s.title.toLowerCase().includes("exam")) || (s.title && s.title.toLowerCase().includes("submit")) || (s.title && s.title.toLowerCase().includes("prepare"));
                  }
                  return true;
                })
                .map((step, idx) => (
                  <div 
                    key={step.id || idx} 
                    className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-5 transition-all hover:border-slate-350 hover:shadow-md animate-in fade-in duration-200"
                  >
                    <div>
                      {/* Step index badge & Category */}
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                        <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                          Step Reference {idx + 1}
                        </span>
                        {step.category && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {step.category === "account" ? "Verification" : step.category === "payment" ? "Payment" : "Exam"}
                          </span>
                        )}
                      </div>

                      {/* Title & desc */}
                      <h3 className="text-base font-extrabold text-slate-800 leading-snug mb-2.5">
                        {step.title}
                      </h3>
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                        {step.description}
                      </p>
                    </div>

                    {step.photoUrl && (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-205 bg-slate-50 group cursor-pointer" onClick={() => setSelectedImage(step.photoUrl)}>
                        <img
                          src={step.photoUrl}
                          alt={step.title}
                          className="w-full h-auto max-h-48 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white uppercase tracking-wider bg-slate-950/90 px-3.5 py-2 rounded-xl shadow-lg border border-white/10">
                            <ZoomIn className="w-3.5 h-3.5" /> Enlarge screenshot
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Guidance lightbox Zoom overlay */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl w-full p-4 md:p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b pb-3.5">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Illustration & Screenshot Details</h4>
                <p className="text-[11px] text-slate-400">Step Guidance Helper</p>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="px-3.5 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors shrink-0"
              >
                Close View
              </button>
            </div>
            
            <div className="overflow-hidden rounded-2xl bg-slate-50 border max-h-[70vh] flex items-center justify-center">
              <img 
                src={selectedImage} 
                alt="Guideline zoom" 
                className="w-auto h-auto max-w-full max-h-[66vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
