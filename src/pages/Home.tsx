import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, ShieldCheck, Clock, Award, Gift, GraduationCap } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Home() {
  const [landingConfig, setLandingConfig] = useState({
    landingTitle: "Nepal's Premier CEE Mock Exam Platform",
    landingDescription: "Prepare for your CEE exam by giving mock tests here. This is a dedicated platform built solely for high-fidelity CEE mock tests. Participate in structured tournaments to test your knowledge, earn attractive prizes and rewards by practicing your questions, learn efficiently, and excel in your medical career roadmap!"
  });

  useEffect(() => {
    async function loadLandingConfig() {
      try {
        // Try the more reliable exams/landing document first
        const examsRef = doc(db, 'exams', 'landing');
        const examsSnap = await getDoc(examsRef);
        if (examsSnap.exists()) {
          const data = examsSnap.data();
          if (data.landingTitle && data.landingDescription) {
            setLandingConfig({
              landingTitle: data.landingTitle,
              landingDescription: data.landingDescription
            });
            return;
          }
        }

        // Fallback to settings/landing
        const docRef = doc(db, 'settings', 'landing');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.landingTitle && data.landingDescription) {
            setLandingConfig({
              landingTitle: data.landingTitle,
              landingDescription: data.landingDescription
            });
          }
        }
      } catch (err) {
        console.warn("Could not load landing configurations from Firestore:", err);
      }
    }
    loadLandingConfig();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 border-b border-blue-800">
        <div className="absolute top-3 right-4 sm:right-6 lg:right-8 select-none pointer-events-none">
          <span className="text-[10px] sm:text-xs text-white/60 font-bold tracking-wider">
            Made by Nikhil Yadav
          </span>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            {landingConfig.landingTitle}
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-3xl mx-auto font-light leading-relaxed">
            {landingConfig.landingDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-8 py-3.5 text-base font-semibold rounded-lg text-blue-900 bg-white hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200">
              Register as Student
            </Link>
            <Link to="/leaderboard" className="px-8 py-3.5 text-base font-semibold rounded-lg text-white bg-blue-700/50 hover:bg-blue-700 border border-blue-600/50 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5" /> View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Website Intent Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-slate-900 uppercase tracking-tight text-sm">Platform Highlights</h2>
          <p className="text-slate-500 text-sm mt-2">A focused space for high-yield pre-medical competitive training.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center mb-4">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-2">Tournaments & Rewards</h3>
            <p className="text-xs text-slate-500 leading-relaxed">This platform provides you with real-time tournaments, not just generic practice. Compete for major rewards!</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center mb-4">
              <Gift className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-2">Earn Prizes</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Excel under mock pressure and walk away with exciting prizes simply by practicing questions regularly.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center mb-4">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-2">Learn & Grow</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Understand question sub-topics, master key concepts, and continuously refine your medical exam strategy.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-2">Pure Mock Setup</h3>
            <p className="text-xs text-slate-500 leading-relaxed">This website is designed strictly and only for high-fidelity CEE Mock test drills under simulated pressure.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-slate-200/60">
        <div className="grid md:grid-cols-3 gap-10">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Real CEE Pattern</h3>
            <p className="text-slate-600 leading-relaxed text-sm">Strictly follows the CEE syllabus. Zoology (40), Botany (40), Physics (50), Chemistry (50), and MAT (20) with -0.25 negative marking.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Time Management</h3>
            <p className="text-slate-600 leading-relaxed text-sm">180 minute locked timer. Fullscreen enforcement and anti-cheat mechanisms ensure a secure and realistic testing environment.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">National Ranking</h3>
            <p className="text-slate-600 leading-relaxed text-sm">Get detailed analytics including subject-wise breakdown, percentile, and rank yourself against top CEE aspirants nationwide.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-3xl mx-auto text-center px-4">
          <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Secure Exam Environment</h2>
          <p className="text-slate-600 text-sm">
            For administrators and staff. If you are an admin, please sign in with your credentials to access the command center.
          </p>
          <Link to="/login" className="mt-6 inline-block text-blue-600 font-semibold hover:text-blue-800 text-sm">
            Admin Login →
          </Link>
        </div>
      </section>
    </div>
  );
}
