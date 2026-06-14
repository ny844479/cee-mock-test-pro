import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Key, ShieldCheck, CheckCircle2, AlertCircle, Info, Settings, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSuccess('Password reset link sent! Check your email (including the spam folder).');
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.tsx auth listener will handle role and redirect
    } catch (err: any) {
      console.warn('Login failed (credentials invalid):', err.code || err.message);
      setError('Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {showForgot ? 'Reset your password' : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {!showForgot && (
            <>
              Or{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                register for a new account
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          {showForgot ? (
            <div>
              {/* BACK TO LOGIN */}
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setForgotError('');
                  setForgotSuccess('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Sign-in Screen
              </button>

              <form onSubmit={handleSendResetLink} className="space-y-5">
                <div className="text-slate-600 text-sm leading-relaxed">
                  Enter the email address registered with your CEE account. We'll send you a password reset link.
                </div>

                {forgotError && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">{forgotError}</p>
                  </div>
                )}
                
                {forgotSuccess && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded flex gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="text-xs text-emerald-700">{forgotSuccess}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Recovery Email Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="forgot-email"
                      required
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          ) : (
              <form className="space-y-6" onSubmit={handleLogin}>
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <p className="text-xs text-red-700">{error}</p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="text-sm">
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-55 cursor-pointer"
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </div>
              </form>
          )}

          {!showForgot && (
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>Don't have an account? <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Register</Link></p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
