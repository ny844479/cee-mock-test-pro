/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Exam from './pages/Exam';
import Payment from './pages/Payment';
import Result from './pages/Result';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Instructions from './pages/Instructions';
import RequireVerification from './components/RequireVerification';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userEmailLower = (currentUser.email || '').toLowerCase();
          if (userEmailLower === 'ny789nk@gmail.com' || userEmailLower === 'ny844479@gmail.com') {
            setUserRole('admin');
            setIsVerified(true);
            const userDocRef = doc(db, 'users', currentUser.uid);
            try {
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                if (userDoc.data().role !== 'admin' || !userDoc.data().emailVerified) {
                  await updateDoc(userDocRef, { role: 'admin', emailVerified: true });
                }
              } else {
                await setDoc(userDocRef, {
                  name: currentUser.displayName || 'Administrator',
                  email: currentUser.email,
                  studentId: 'ADMIN',
                  role: 'admin',
                  emailVerified: true
                });
              }
            } catch (fsErr) {
              console.error("Failed to sync admin user document in Firestore:", fsErr);
            }
          } else {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserRole(userDoc.data().role);
              
              const fbVerified = currentUser.emailVerified;
              const dbVerified = userDoc.data().emailVerified;
              
              if (fbVerified && !dbVerified) {
                await updateDoc(userDocRef, { emailVerified: true });
                setIsVerified(true);
              } else if (dbVerified) {
                setIsVerified(true);
              } else {
                setIsVerified(false);
              }
            } else {
              setUserRole('student');
              setIsVerified(currentUser.emailVerified);
            }
          }
        } catch (error) {
          console.error("Error fetching user role", error);
          const userEmailLower = (currentUser.email || '').toLowerCase();
          if (userEmailLower === 'ny789nk@gmail.com' || userEmailLower === 'ny844479@gmail.com') {
            setUserRole('admin');
          } else {
            setUserRole('student');
          }
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">Loading CEE Mock Test Pro...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout user={user} userRole={userRole} />}>
          <Route index element={!user ? <Home /> : <Navigate to={(userRole === 'admin' || userRole === 'co-admin') ? "/admin" : "/dashboard"} replace />} />
          <Route path="login" element={!user ? <Login /> : <Navigate to={(userRole === 'admin' || userRole === 'co-admin') ? "/admin" : "/dashboard"} />} />
          <Route path="register" element={!user ? <Register /> : <Navigate to={(userRole === 'admin' || userRole === 'co-admin') ? "/admin" : "/dashboard"} />} />
          
          <Route 
            path="dashboard" 
            element={user && (userRole !== 'admin' && userRole !== 'co-admin') ? <StudentDashboard user={user} isVerified={isVerified} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="admin" 
            element={user && (userRole === 'admin' || userRole === 'co-admin') ? <AdminDashboard userRole={userRole} /> : <Navigate to="/" />} 
          />
          <Route 
            path="payment/:examId" 
            element={user && (userRole !== 'admin' && userRole !== 'co-admin') ? <RequireVerification user={user} isVerified={isVerified}><Payment user={user} /></RequireVerification> : <Navigate to="/login" />} 
          />
          <Route 
            path="result/:resultId" 
            element={user ? <Result user={user} isAdmin={userRole === 'admin' || userRole === 'co-admin'} /> : <Navigate to="/login" />} 
          />
          <Route path="leaderboard" element={<Leaderboard user={user} />} />
          <Route path="instructions" element={<Instructions />} />
          <Route 
            path="profile" 
            element={user ? <Profile user={user} userRole={userRole} /> : <Navigate to="/login" />} 
          />
        </Route>
        
        <Route 
          path="/exam/:examId" 
          element={user && (userRole !== 'admin' && userRole !== 'co-admin') ? <RequireVerification user={user} isVerified={isVerified}><Exam user={user} /></RequireVerification> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

