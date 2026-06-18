import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, Upload, Trash, Image as ImageIcon, Clock, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

interface PaymentProps {
  user: User;
}

export default function Payment({ user }: PaymentProps) {
  const { examId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exam, setExam] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Custom configurations state
  const [paymentNumber, setPaymentNumber] = useState('9822531607');
  const [paymentMethod, setPaymentMethod] = useState('eSewa');
  const [paymentInstructions, setPaymentInstructions] = useState(
    "1. Open eSewa app\n2. Send exactly Rs. {price} to 9822531607\n3. Copy the Transaction ID from the receipt\n4. Take a screenshot of the payment receipt\n5. Upload the screenshot and enter Transaction ID below"
  );

  // Screenshot states
  const [screenshot, setScreenshot] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!examId) return;

      // 1. Fetch exam details
      try {
        const docSnap = await getDoc(doc(db, 'exams', examId));
        if (docSnap.exists()) {
          setExam({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError("Exam not found");
        }
      } catch (e) {
        console.error("Could not fetch exam details:", e);
      }

      // 2. Fetch payments instructions config
      try {
        let loaded = false;
        const CACHE_KEY = "payment_config_cache";
        const CACHE_EXPIRY = 60 * 60 * 1000;
        const now = new Date().getTime();
        const cachedStr = localStorage.getItem(CACHE_KEY);
        const cache = cachedStr ? JSON.parse(cachedStr) : null;
        
        let pData = null;

        if (cache && cache.timestamp && (now - cache.timestamp < CACHE_EXPIRY)) {
          pData = cache.data;
        } else {
          const settingsSnap = await getDoc(doc(db, 'settings', 'payment'));
          if (settingsSnap.exists()) {
             pData = settingsSnap.data();
          } else {
             const examsSnap = await getDoc(doc(db, 'exams', 'payment'));
             if (examsSnap.exists()) {
               pData = examsSnap.data();
             }
          }
          if (pData) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              timestamp: now,
              data: pData
            }));
          }
        }

        if (pData) {
          if (pData.paymentNumber) setPaymentNumber(pData.paymentNumber);
          if (pData.paymentMethod) setPaymentMethod(pData.paymentMethod);
          if (pData.paymentInstructions) setPaymentInstructions(pData.paymentInstructions);
        }
      } catch (paymentErr) {
        console.warn("Could not load custom payment setup, using standards:", paymentErr);
      }
    }

    loadData();
  }, [examId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Image file cannot be larger than 10MB");
      return;
    }

    setIsCompressing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      setScreenshotPreview(base64Str);
      
      // Perform dynamic client-side scaling/compression so it is extremely small and fits perfectly inside Firestore limits and can be quickly parsed
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const max_size = 700; // optimized size
        if (width > max_size || height > max_size) {
          if (width > height) {
            height = Math.round((height * max_size) / width);
            width = max_size;
          } else {
            width = Math.round((width * max_size) / height);
            height = max_size;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compressed JPEG at 60% quality is extremely optimized for OCR (20kb-45kb)
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          setScreenshot(compressed);
        } else {
          setScreenshot(base64Str);
        }
        setIsCompressing(false);
      };
      
      img.onerror = () => {
        setScreenshot(base64Str);
        setIsCompressing(false);
      };
      
      img.src = base64Str;
    };

    reader.onerror = () => {
      setIsCompressing(false);
    };

    reader.readAsDataURL(file);
  };

  const isPaymentLocked = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTransactionId = transactionId.trim();
    if (!cleanTransactionId) {
      setError("Please enter a valid Transaction ID");
      return;
    }
    if (!screenshot) {
      setError("Please upload the payment screenshot receipt to proceed");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const paymentId = `${user.uid}_${examId}`;
      const paymentRef = doc(db, 'payments', paymentId);
      
      let existingPayment = null;
      try {
        const paymentSnap = await getDoc(paymentRef);
        existingPayment = paymentSnap.exists() ? paymentSnap.data() : null;
      } catch (docErr) {
        console.warn("Could not retrieve existing payment (this is expected on first submission):", docErr);
      }

      // 1. Check for duplicate transaction globally
      const txDocRef = doc(db, 'transaction_codes', cleanTransactionId);
      const txDoc = await getDoc(txDocRef);
      if (txDoc.exists()) {
        const txData = txDoc.data();
        const isSelfReuseOfRejected =
          txData.usedBy === user.uid &&
          txData.examId === examId &&
          existingPayment &&
          existingPayment.status === 'rejected';

        if (!isSelfReuseOfRejected) {
          setError("This transaction code has already been used.");
          setLoading(false);
          return;
        }
      }

      // 2. Perform automated verification via Gemini Vision API
      let finalStatus = 'pending'; // Default to pending if auto-verify isn't conclusive
      try {
        const response = await fetch('/api/analyze-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageBase64: screenshot,
            paymentMethod: paymentMethod,
            paymentNumber: paymentNumber,
            expectedAmount: parseFloat(exam.price)
          }),
        });
        
        if (response.ok) {
          const analysis = await response.json();
          
          const normalizeTxId = (id: string) => {
            return (id || "")
              .substring(0, 100)
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "")
              .replace(/O/g, "0")
              .replace(/[IL]/g, "1");
          };

          const cleanExtracted = normalizeTxId(analysis.transactionId);
          const cleanUser = normalizeTxId(cleanTransactionId);
           
          const extractedAmountStr = String(analysis.amount || "").replace(/[^0-9.]/g, "");
          const extractedAmount = parseFloat(extractedAmountStr);
          const requiredAmount = parseFloat(exam.price);

          const receiverText = String(analysis.receiverInfo || "").toLowerCase();
          
          // Dynamic Receiver Checks
          const cleanAdminNum = paymentNumber ? paymentNumber.replace(/\s+/g, "") : "";
          const matchesReceiver = 
            !receiverText || // Lenient if OCR fails to read receiver field clearly
            receiverText.includes("nikhil") || 
            receiverText.includes("yadav") || 
            receiverText.includes("kumar") || 
            (cleanAdminNum && receiverText.includes(cleanAdminNum)) ||
            (paymentMethod && receiverText.includes(paymentMethod.toLowerCase())) ||
            receiverText.length < 3;

          const isTxIdMatching = 
            cleanExtracted === cleanUser || 
            (cleanExtracted.length >= 6 && cleanUser.includes(cleanExtracted)) || 
            (cleanUser.length >= 6 && cleanExtracted.includes(cleanUser));

          console.log("Automated verification extraction diagnostics:", {
            cleanExtracted,
            cleanUser,
            isTxIdMatching,
            extractedAmount,
            requiredAmount,
            receiverText,
            matchesReceiver
          });

          // We mark as approved if the transaction pattern, amount, and recipient filters are satisfied
          if (isTxIdMatching && !isNaN(extractedAmount) && extractedAmount >= requiredAmount && matchesReceiver) {
             finalStatus = 'approved';
          } else {
             // If the amount is less or any discrepancy, leave it as pending for manual review
             finalStatus = 'pending';
             if (extractedAmount < requiredAmount && matchesReceiver && isTxIdMatching) {
                 finalStatus = 'rejected'; // Auto-reject if clearly underpaid
             }
          }
        }
      } catch (analyzeErr) {
        console.warn("Auto verification failed (AI error), falling back to pending:", analyzeErr);
      }

      const paymentData = {
        studentId: user.uid,
        examId: examId,
        transactionId: cleanTransactionId,
        screenshot: screenshot,
        paymentMethod: paymentMethod,
        status: finalStatus,
        submittedAt: new Date().toISOString()
      };

      // 3. Mark the transaction code as used FIRST
      await setDoc(txDocRef, {
        usedBy: user.uid,
        examId: examId,
        timestamp: new Date().toISOString()
      });

      // 4. Save payment record
      await setDoc(doc(db, 'payments', paymentId), paymentData);

      if (finalStatus === 'approved') {
        alert("Your payment was auto-verified successfully!");
      } else if (finalStatus === 'rejected') {
        alert("Your payment was rejected (insufficient amount).");
      } else {
        alert("Payment submitted. Pending manual verification by admin.");
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit payment details");
    } finally {
      setLoading(false);
    }
  };

  if (!exam) return <div className="p-8 text-center text-slate-500">Loading exam details...</div>;

  return (
    <div className="min-h-[75vh] flex flex-col justify-center py-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Purchase Exam Access</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-850">{exam.title}</span> • Rs. {exam.price}
          </p>
          {(exam.startTime || exam.endTime) && (
            <div className="mt-2 flex flex-col items-center text-[10px] text-slate-500 bg-white inline-block px-2.5 py-1 rounded-lg border border-slate-200">
              {exam.startTime && <div>Starts: <span className="font-medium text-slate-700">{new Date(exam.startTime).toLocaleString()}</span></div>}
              {exam.endTime && <div>Ends: <span className="font-medium text-slate-700">{new Date(exam.endTime).toLocaleString()}</span></div>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          
          {isPaymentLocked ? (
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-4">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-rose-100 text-rose-600 mb-1">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-rose-800 leading-snug">
                Payment Window Closed
              </h3>
              <p className="text-xs text-rose-650 leading-relaxed">
                This paid test automatically locks for purchase exactly 10 minutes before the starting time. You can no longer make a payment or purchase access for this test.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-750 font-bold text-white text-xs rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01]"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Payment Instructions:</h3>
                <div className="text-xs text-blue-800 space-y-1 whitespace-pre-line leading-relaxed">
                  {paymentInstructions.replace(/{price}/g, exam.price || '0')}
                </div>
                <p className="mt-3 text-[10px] text-blue-600 italic font-medium leading-relaxed">
                  Admin will verify your receipt and screenshot manually. Access will be granted shortly after verification.
                </p>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="transactionId" className="block text-sm font-semibold text-slate-700 mb-1">
                    {paymentMethod} Transaction ID
                  </label>
                  <div>
                    <input
                      id="transactionId"
                      name="transactionId"
                      type="text"
                      placeholder="e.g. 000ABC123"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Upload Payment Screenshot
                  </label>
                  <div className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 hover:border-blue-400 hover:bg-slate-50/50 transition-all duration-150 relative">
                    {screenshotPreview ? (
                      <div className="relative w-full flex flex-col items-center">
                        <img 
                          src={screenshotPreview} 
                          alt="Receipt Preview" 
                          className={`max-h-40 object-contain rounded border border-slate-200 bg-slate-50 transition-opacity ${isCompressing ? 'opacity-40' : 'opacity-100'}`} 
                        />
                        {isCompressing && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                            <span className="text-xs font-bold text-blue-600 animate-pulse">Running image optimization...</span>
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={isCompressing}
                          onClick={() => {
                            setScreenshotPreview('');
                            setScreenshot('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="mt-3 inline-flex items-center gap-1 text-xs text-red-655 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100/55 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash className="w-3.5 h-3.5" /> Remove Receipt screenshot
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer w-full py-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2.5">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-blue-600 hover:text-blue-500">
                          {isCompressing ? 'Processing file...' : 'Choose screenshot receipt file'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">PNG, JPG formats (auto-compressed on select)</span>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          className="sr-only"
                          onChange={handleFileChange}
                          disabled={isCompressing}
                          required
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || isCompressing}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    {isCompressing ? 'Optimizing receipt image...' : loading ? 'Submitting Details...' : 'Submit Payment Access Request'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
