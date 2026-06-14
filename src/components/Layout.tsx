import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogOut, BookOpen, Trophy, Shield, User as UserIcon, Menu, X, ArrowRight, UserCheck, ScrollText } from 'lucide-react';

interface LayoutProps {
  user: User | null;
  userRole: string | null;
}

export default function Layout({ user, userRole }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-16 py-3 md:py-0 flex-wrap md:flex-nowrap gap-4 md:gap-0">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                C
              </div>
              <span className="font-bold text-lg sm:text-xl tracking-tight text-blue-900">
                CEE Mock Test <span className="font-light">Pro</span>
              </span>
            </Link>

            {/* Desktop Navigation (Laptop) */}
            <nav className="hidden md:flex items-center gap-6">
              {user ? (
                <>
                  <Link to="/leaderboard" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors">
                    <Trophy className="w-4 h-4" /> Leaderboard
                  </Link>
                  <Link to="/instructions" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors">
                    <ScrollText className="w-4 h-4" /> Instructions
                  </Link>
                  {userRole === 'admin' ? (
                    <Link to="/admin" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors">
                      <Shield className="w-4 h-4" /> Admin Dashboard
                    </Link>
                  ) : (
                    <Link to="/dashboard#previous-results" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors">
                      <BookOpen className="w-4 h-4" /> My Exams
                    </Link>
                  )}
                  <div className="h-6 w-px bg-slate-200 mx-1"></div>
                  <div className="flex items-center gap-3">
                    <Link 
                      to="/profile" 
                      className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full transition-all ${
                        location.pathname === '/profile' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <UserIcon className="w-4 h-4 text-slate-500" />
                      {userRole === 'admin' ? 'Admin Profile' : 'My Account'}
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/leaderboard" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> Leaderboard
                  </Link>
                  <Link to="/instructions" className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1">
                    <ScrollText className="w-4 h-4" /> Instructions
                  </Link>
                  <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600">
                    Sign in
                  </Link>
                  <Link to="/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm">
                    Register
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile Navigation Toggle (Hamburger button) */}
            <div className="flex md:hidden items-center gap-2">
              <Link
                to="/leaderboard"
                className="text-slate-600 hover:text-amber-500 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Leaderboard Rank"
              >
                <Trophy className="w-6 h-6" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-600 hover:text-blue-600 p-2 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-150 bg-white shadow-lg animate-fade-in transition-all">
            <div className="px-4 pt-3 pb-6 space-y-3">
              {user ? (
                <>
                  {/* Student/Admin Welcome Summary */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-2 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                        {user.email ? user.email.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          {userRole === 'admin' ? 'Administrator role' : 'Student'}
                        </div>
                        <div className="text-sm font-black text-slate-800 truncate max-w-[200px]">{user.email}</div>
                      </div>
                    </div>
                    
                    <Link 
                      to="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="mt-3 w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      <UserIcon className="w-3.5 h-3.5" /> Edit Name, Email, Phone
                    </Link>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1">
                    <Link 
                      to="/leaderboard" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Trophy className="w-4 h-4 text-slate-400" /> Leaderboard Rank
                    </Link>
                    
                    <Link 
                      to="/instructions" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <ScrollText className="w-4 h-4 text-slate-400" /> Site Instructions
                    </Link>
                    
                    {userRole === 'admin' ? (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <Shield className="w-4 h-4 text-slate-400" /> Admin Dashboard
                      </Link>
                    ) : (
                      <Link 
                        to="/dashboard" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <BookOpen className="w-4 h-4 text-slate-400" /> My Exam Board
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold text-red-650 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                    >
                      <LogOut className="w-4 h-4 text-red-550" /> Logout Securely
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Logged Out Mobile Display */}
                  <div className="space-y-2">
                    <Link 
                      to="/leaderboard" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Trophy className="w-4 h-4 text-slate-400" /> Leaderboard Rank
                    </Link>

                    <Link 
                      to="/instructions" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <ScrollText className="w-4 h-4 text-slate-400" /> Site Instructions
                    </Link>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Link 
                        to="/login" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-all text-center"
                      >
                        Sign in
                      </Link>
                      <Link 
                        to="/register" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all text-center shadow-sm"
                      >
                        Register
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow w-full">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} CEE Mock Test Pro. All rights reserved.</p>
          <p className="mt-1">Medical Entrance Mock Exams</p>
          <p className="mt-2 text-xs text-slate-400 font-medium">Made by Nikhil Yadav</p>
        </div>
      </footer>
    </div>
  );
}
