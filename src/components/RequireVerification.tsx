import React, { useState } from 'react';
import { User, sendEmailVerification } from 'firebase/auth';
import { Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';

export default function RequireVerification({ user, isVerified, children }: { user: User, isVerified: boolean, children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [reloading, setReloading] = useState(false);

  if (isVerified) {
    return <>{children}</>;
  }

  const handleSendVerification = async () => {
    setLoading(true);
    setError('');
    try {
      await sendEmailVerification(user);
      setSent(true);
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a minute before sending another email.');
      } else {
        setError(err.message || 'Failed to send verification email. Try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await user.reload();
      if (auth.currentUser?.emailVerified) {
        window.location.reload(); // Hard reload to update routes and global state cleanly
      } else {
        setError('Your email is still not verified. Please check your inbox and click the link.');
      }
    } catch (error) {
      setError('Failed to refresh status.');
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-amber-200 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
        
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
          <Mail className="w-8 h-8 text-amber-600" />
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Verify Your Email Address</h2>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          We need to verify your email address to ensure account security. 
          Please check your inbox (and <span className="font-semibold text-gray-800">spam/junk folder</span>) for a verification link.
        </p>

        {error && (
          <div className="mb-6 bg-red-50 text-red-700 text-xs px-4 py-3 rounded-xl border border-red-200 font-medium">
            {error}
          </div>
        )}

        {sent && (
          <div className="mb-6 bg-emerald-50 text-emerald-800 text-sm px-4 py-3 xl rounded-xl border border-emerald-200 font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Verification email sent successfully!
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleReload}
            disabled={reloading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
            {reloading ? 'Checking...' : 'I have verified my email'}
          </button>

          <button
            onClick={handleSendVerification}
            disabled={loading || sent}
            className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => auth.signOut()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out and try later
          </button>
        </div>
      </div>
    </div>
  );
}
