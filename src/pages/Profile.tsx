import React, { useState, useEffect } from 'react';
import { User, signOut, updateEmail, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Phone, Shield, LogOut, CheckCircle, AlertCircle, Save, ArrowLeft, Smartphone, Laptop, Eye, EyeOff } from 'lucide-react';

interface ProfileProps {
  user: User | null;
  userRole: string | null;
}

export default function Profile({ user, userRole }: ProfileProps) {
  const navigate = useNavigate();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [role, setRole] = useState('student');
  const [isVerified, setIsVerified] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword.length < 6) {
      setPassErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('Passwords do not match.');
      return;
    }
    
    setChangingPass(true);
    setPassSuccessMsg(null);
    setPassErrorMsg(null);
    
    try {
      await updatePassword(user, newPassword);
      setPassSuccessMsg('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      if (err.code === 'auth/requires-recent-login') {
        setPassErrorMsg('For security, changing password requires logging in again.');
      } else {
        setPassErrorMsg(err.message || 'An error occurred while changing your password.');
      }
    } finally {
      setChangingPass(false);
    }
  };

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) return;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || '');
          setEmail(data.email || user.email || '');
          setPhone(data.phone || '');
          setStudentId(data.studentId || '');
          setRole(userRole || data.role || 'student');
          setIsVerified(user.emailVerified || data.emailVerified || false);
        } else {
          // Fallback if document does not exist yet
          setName(user.displayName || '');
          setEmail(user.email || '');
          setPhone('');
          setStudentId('N/A');
          setRole(userRole || 'student');
          setIsVerified(user.emailVerified);
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        setErrorMsg('Could not load profile details.');
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. If email changed, update in Firebase Authentication
      if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
        try {
          await updateEmail(user, email.trim().toLowerCase());
        } catch (authErr: any) {
          // Most common error might be "requires-recent-login"
          if (authErr.code === 'auth/requires-recent-login') {
            throw new Error('For security, updating email requires re-logging in first.');
          }
          throw authErr;
        }
      }

      // 2. Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim()
      };
      
      if (userRole === 'admin' || role === 'admin') {
        updateData.studentId = studentId.trim();
      }

      await updateDoc(userDocRef, updateData);

      // 3. Keep results in sync with new name
      try {
        const resultsQuery = query(collection(db, 'results'), where('studentId', '==', user.uid));
        const qs = await getDocs(resultsQuery);
        const updates = qs.docs.map(d => updateDoc(doc(db, 'results', d.id), { studentName: name.trim().substring(0, 95) }));
        await Promise.all(updates);
      } catch (e) {
        console.error("Failed to sync name to results", e);
      }

      setSuccessMsg('Your profile has been updated successfully.');
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrorMsg(err.message || 'An error occurred while updating your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <p className="text-slate-600 mb-4">Please log in to manage your profile.</p>
        <Link to="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
          Go to Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 font-medium">
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link 
          to={role === 'admin' ? '/admin' : '/dashboard'} 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your student credentials, phone registry, and authentication states</p>
        </div>

        {/* -------------------- 1. LAPTOP VERSION OF THE PAGE -------------------- */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          {/* Side card - user overview and action panel */}
          <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-full min-h-[380px]">
            <div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-600 border border-blue-200/50 mb-3 shadow-inner">
                  <UserIcon className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{name ? name : (userRole === 'admin' ? 'Admin Account' : 'Student Account')}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 uppercase tracking-wide">
                    {userRole || role}
                  </span>
                  {isVerified ? (
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 uppercase tracking-wide flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Unverified
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-medium mt-2">
                  CEE ID: {studentId || 'Not Assigned'}
                </span>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 space-y-3 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-600">Laptop Layout Viewed</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  You are editing your primary credentials from your laptop computer. Make sure to press Save Changes below after modifying your information.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:text-white hover:bg-red-600 rounded-lg text-sm font-semibold transition-all hover:shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>

          {/* Main content panel - Form edit */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                Personal Information
              </h2>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                {successMsg && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-emerald-800 font-medium">{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-rose-800 font-medium">{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{userRole === 'admin' ? 'CEE ID' : 'CEE ID (Read-only)'}</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        disabled={userRole !== 'admin'}
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className={`w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none transition-all ${userRole === 'admin' ? 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800' : 'bg-slate-100 border-slate-250 text-slate-400 cursor-not-allowed'}`}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Enter phone number (e.g. +977-XXXXXXXXXX)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-55 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Security & Password Change
              </h2>

              <form onSubmit={handleChangePassword} className="space-y-5">
                {passSuccessMsg && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded flex items-start gap-2.5">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-emerald-800 font-medium">{passSuccessMsg}</span>
                  </div>
                )}

                {passErrorMsg && (
                  <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-rose-800 font-medium">{passErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-4 pr-10 py-2.5 text-sm text-slate-800 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Verify new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-4 pr-10 py-2.5 text-sm text-slate-800 outline-none transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-55 cursor-pointer"
                  >
                    {changingPass ? 'Updating password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* -------------------- 2. MOBILE VERSION OF THE PAGE -------------------- */}
        <div className="md:hidden space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-850">Hello, {name ? name : (userRole === 'admin' ? 'Admin' : 'Student')}!</h3>
            <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase">
              Mobile {userRole === 'admin' ? 'Admin' : 'Account'} View
            </span>
            <div className="flex justify-center mt-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black uppercase">
                  <AlertCircle className="w-3 h-3" /> Unverified
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-semibold">
              CEE Mock registration: {studentId}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Need to secure or disconnect?</span>
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-0.5"
              >
                <LogOut className="w-3 h-3" /> Log out now
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-1 text-slate-800 mb-5">
              <UserIcon className="w-4 h-4 text-indigo-500" />
              <h2 className="text-md font-bold">Edit Account details</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {successMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs text-emerald-850 font-bold flex gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-xs text-rose-850 font-bold flex gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Full Student Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{userRole === 'admin' ? 'CEE ID' : 'CEE ID (Read-Only)'}</label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-all ${userRole === 'admin' ? 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800' : 'bg-slate-100 border-slate-250 text-slate-400 cursor-not-allowed'}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Primary Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Phone Number / Contact</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-xs text-slate-800 outline-none transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all disabled:opacity-55 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-4">
            <div className="flex items-center gap-1 text-slate-800 mb-5">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h2 className="text-md font-bold">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {passSuccessMsg && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs text-emerald-850 font-bold flex gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passSuccessMsg}</span>
                </div>
              )}

              {passErrorMsg && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded text-xs text-rose-850 font-bold flex gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{passErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 pr-10 py-2 text-xs text-slate-800 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 pr-10 py-2 text-xs text-slate-800 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all disabled:opacity-55 cursor-pointer"
                >
                  {changingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

