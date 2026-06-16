import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  where,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Shield,
  Users,
  CreditCard,
  BookOpen,
  FileQuestion,
  MessageSquare,
  Settings,
  Search,
  ScrollText,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface AdminDashboardProps {
  userRole?: string | null;
}

export default function AdminDashboard({ userRole }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("exams");
  const [exams, setExams] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersSearchQuery, setUsersSearchQuery] = useState("");

  // New Exam Form State
  const [newExam, setNewExam] = useState({
    title: "",
    price: 0,
    duration: 180,
    isActive: false,
    totalQuestions: 200,
    startTime: "",
    endTime: "",
    leaderboardEnabled: true,
    isPaid: true,
  });

  // New Question Form State
  const [selectedExamId, setSelectedExamId] = useState("");
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    opt1: "",
    opt2: "",
    opt3: "",
    opt4: "",
    correctAnswer: "opt1",
    subject: "Zoology",
  });

  const [bulkQuestions, setBulkQuestions] = useState("");
  const [bulkSubject, setBulkSubject] = useState("Zoology");

  const [previewExamId, setPreviewExamId] = useState("");
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [editingQuestionData, setEditingQuestionData] = useState<any>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentExamFilter, setPaymentExamFilter] = useState("");

  // WhatsApp settings and notice customizer states
  const [whatsappLink, setWhatsappLink] = useState("");
  const [noticeTitle, setNoticeTitle] = useState(
    "CEE Mock Test Pro Notice",
  );
  const [noticeBody, setNoticeBody] = useState(
    "Attention Students: All tournament prizes for this mock test season will be distributed exclusively through the official WhatsApp group. Click the join link to stay eligible and receive direct updates.",
  );
  const [buttonText, setButtonText] = useState("Join WhatsApp Group");
  const [noticeIsActive, setNoticeIsActive] = useState(true);
  const [savingWhatsappLink, setSavingWhatsappLink] = useState(false);

  // Landing page description states
  const [adminLandingTitle, setAdminLandingTitle] = useState(
    "Nepal's Premier CEE Mock Exam Platform",
  );
  const [adminLandingDescription, setAdminLandingDescription] = useState(
    "Prepare for your CEE exam by giving mock tests here. This is a dedicated platform built solely for high-fidelity CEE mock tests. Participate in structured tournaments to test your knowledge, earn attractive prizes and rewards by practicing your questions, learn efficiently, and excel in your medical career roadmap!",
  );
  const [savingLandingSettings, setSavingLandingSettings] = useState(false);

  // Payment configuration customizer states
  const [adminPaymentInstructions, setAdminPaymentInstructions] = useState(
    "1. Open eSewa app\n2. Send exactly Rs. {price} to 9822531607\n3. Copy the Transaction ID from the receipt\n4. Take a screenshot of the payment receipt\n5. Upload the screenshot and enter Transaction ID below",
  );
  const [adminPaymentNumber, setAdminPaymentNumber] = useState("9822531607");
  const [adminPaymentMethod, setAdminPaymentMethod] = useState("eSewa");
  const [savingPaymentConfig, setSavingPaymentConfig] = useState(false);
  const [instructionSteps, setInstructionSteps] = useState<any[]>([]);
  const [adminActiveFilter, setAdminActiveFilter] = useState("all");
  const [savingInstructions, setSavingInstructions] = useState(false);

  // Private states for receipt zoom lightbox
  const [selectedPaymentScreenshot, setSelectedPaymentScreenshot] = useState<
    any | null
  >(null);

  const [editingStudent, setEditingStudent] = useState<{ id: string, name: string, studentId: string } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        try {
          await onConfirm();
        } catch (e) {
          console.error("Execution error during confirmation action:", e);
        } finally {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleUpdateStudentId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateDoc(doc(db, "users", editingStudent.id), {
        studentId: editingStudent.studentId
      });
      setUsers(users.map(u => u.id === editingStudent.id ? { ...u, studentId: editingStudent.studentId } : u));
      setEditingStudent(null);
    } catch (err) {
      console.error("Error updating student id:", err);
      alert("Failed to update Student ID");
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean | undefined) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "users", userId), {
        emailVerified: newStatus
      });
      setUsers(users.map(u => u.id === userId ? { ...u, emailVerified: newStatus } : u));
    } catch (err) {
      console.error("Error toggling verification:", err);
      alert("Failed to update verification status: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleToggleAdminRole = async (userId: string, currentRole: string | undefined) => {
    if (userRole !== 'admin') return;
    try {
      const newRole = currentRole === 'co-admin' ? 'student' : 'co-admin';
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error("Error toggling role:", err);
      alert("Failed to update role: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDeleteStudent = async (userId: string) => {
    triggerConfirm(
      "Confirm Student Deletion",
      "Are you sure you want to permanently delete this student record? This cannot be undone.",
      async () => {
        try {
          await deleteDoc(doc(db, "users", userId));
          setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
          console.error("Error deleting student:", err);
          alert("Failed to delete student: " + (err instanceof Error ? err.message : String(err)));
        }
      }
    );
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === "exams" || activeTab === "questions") {
        const snapshot = await getDocs(query(collection(db, "exams")));
        const examsData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(
            (exam) =>
              exam.id !== "whatsapp" &&
              exam.id !== "landing" &&
              exam.id !== "payment" &&
              exam.id !== "instructions",
          );
        setExams(examsData);
        if (
          activeTab === "questions" &&
          examsData.length > 0 &&
          !selectedExamId
        ) {
          setSelectedExamId(examsData[0].id);
        }
      }
      if (activeTab === "payments") {
        const [paymentsSnap, usersSnap, examsSnap] = await Promise.all([
          getDocs(query(collection(db, "payments"))),
          getDocs(query(collection(db, "users"))),
          getDocs(query(collection(db, "exams"))),
        ]);
        setPayments(
          paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setUsers(usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setExams(
          examsSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (exam) =>
                exam.id !== "whatsapp" &&
                exam.id !== "landing" &&
                exam.id !== "payment" &&
                exam.id !== "instructions",
            ),
        );
      }
      if (activeTab === "users") {
        const [usersSnap, examsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"))),
          getDocs(query(collection(db, "exams"))),
        ]);
        setUsers(usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setExams(
          examsSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (exam) =>
                exam.id !== "whatsapp" &&
                exam.id !== "landing" &&
                exam.id !== "payment" &&
                exam.id !== "instructions",
            ),
        );
      }
      if (activeTab === "whatsapp") {
        let loaded = false;
        try {
          const docRef = doc(db, "exams", "whatsapp");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setWhatsappLink(data.whatsappLink || data.link || "");
            setNoticeTitle(
              data.title || "CEE Mock Test Pro Notice",
            );
            setNoticeBody(
              data.noticeBody ||
                "Attention Students: All tournament prizes for this mock test season will be distributed exclusively through the official WhatsApp group. Click the join link to stay eligible and receive direct updates.",
            );
            setButtonText(data.buttonText || "Join WhatsApp Group");
            setNoticeIsActive(data.isActive === true);
            loaded = true;
          }
        } catch (e) {
          console.log("Could not load from exams/whatsapp:", e);
        }

        if (!loaded) {
          try {
            const docRef = doc(db, "settings", "whatsapp");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setWhatsappLink(data.link || data.whatsappLink || "");
              setNoticeTitle(
                data.title || "CEE Mock Test Pro Notice",
              );
              setNoticeBody(
                data.noticeBody ||
                  "Attention Students: All tournament prizes for this mock test season will be distributed exclusively through the official WhatsApp group. Click the join link to stay eligible and receive direct updates.",
              );
              setButtonText(data.buttonText || "Join WhatsApp Group");
              setNoticeIsActive(data.isActive !== false);
            }
          } catch (e) {
            console.warn(
              "Could not load backup settings/whatsapp configuration",
              e,
            );
          }
        }
      }
      if (activeTab === "landing") {
        let loaded = false;
        try {
          const docRef = doc(db, "exams", "landing");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAdminLandingTitle(
              data.landingTitle || "Nepal's Premier CEE Mock Exam Platform",
            );
            setAdminLandingDescription(
              data.landingDescription ||
                "Prepare for your CEE exam by giving mock tests here. This is a dedicated platform built solely for high-fidelity CEE mock tests. Participate in structured tournaments to test your knowledge, earn attractive prizes and rewards by practicing your questions, learn efficiently, and excel in your medical career roadmap!",
            );
            loaded = true;
          }
        } catch (e) {
          console.log("Could not load from exams/landing:", e);
        }

        if (!loaded) {
          try {
            const docRef = doc(db, "settings", "landing");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setAdminLandingTitle(
                data.landingTitle || "Nepal's Premier CEE Mock Exam Platform",
              );
              setAdminLandingDescription(
                data.landingDescription ||
                  "Prepare for your CEE exam by giving mock tests here. This is a dedicated platform built solely for high-fidelity CEE mock tests. Participate in structured tournaments to test your knowledge, earn attractive prizes and rewards by practicing your questions, learn efficiently, and excel in your medical career roadmap!",
              );
            }
          } catch (e) {
            console.warn("Could not load setting settings/landing config:", e);
          }
        }
      }
      if (activeTab === "payment_config") {
        let loaded = false;
        try {
          const docRef = doc(db, "settings", "payment");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAdminPaymentInstructions(
              data.paymentInstructions ||
                "1. Open eSewa app\n2. Send exactly Rs. {price} to 9822531607\n3. Copy the Transaction ID from the receipt\n4. Take a screenshot of the payment receipt\n5. Upload the screenshot and enter Transaction ID below",
            );
            setAdminPaymentNumber(data.paymentNumber || "9822531607");
            setAdminPaymentMethod(data.paymentMethod || "eSewa");
            loaded = true;
          }
        } catch (e) {
          console.log("Could not load from settings/payment:", e);
        }

        if (!loaded) {
          try {
            const docRef = doc(db, "exams", "payment");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setAdminPaymentInstructions(
                data.paymentInstructions ||
                  "1. Open eSewa app\n2. Send exactly Rs. {price} to 9822531607\n3. Copy the Transaction ID from the receipt\n4. Take a screenshot of the payment receipt\n5. Upload the screenshot and enter Transaction ID below",
              );
              setAdminPaymentNumber(data.paymentNumber || "9822531607");
              setAdminPaymentMethod(data.paymentMethod || "eSewa");
            }
          } catch (e) {
            console.warn("Could not load backup exams/payment config:", e);
          }
        }
      }
      if (activeTab === "instructions") {
        let loaded = false;
        try {
          const docRef = doc(db, "exams", "instructions");
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setInstructionSteps(data.steps || []);
            loaded = true;
          }
        } catch (e) {
          console.log("Could not load from exams/instructions:", e);
        }

        if (!loaded) {
          try {
            const docRef = doc(db, "settings", "instructions");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              setInstructionSteps(data.steps || []);
            }
          } catch (e) {
            console.warn("Could not load backup settings/instructions:", e);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching data", err);
      if (err.message?.includes("Missing or insufficient permissions")) {
        setErrorMsg(
          "Permission Denied: Your Firebase Rules need to be updated. Please copy the local 'firestore.rules' file to your Firebase console and deploy it.",
        );
      } else {
        setErrorMsg("Failed to load data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWhatsappLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWhatsappLink(true);

    const cleanLink = whatsappLink.trim();
    const cleanTitle = noticeTitle.trim();
    const cleanBody = noticeBody.trim();
    const cleanButton = buttonText.trim();

    let savedExams = false;
    let savedSettings = false;

    // Save to always-readable exams/whatsapp collection complying with isValidExam schema
    try {
      await setDoc(doc(db, "exams", "whatsapp"), {
        title: cleanTitle.substring(0, 200), // Enforce 200 char schema limit
        price: 0,
        duration: 0,
        isActive: noticeIsActive,
        whatsappLink: cleanLink,
        noticeBody: cleanBody,
        buttonText: cleanButton,
      });
      savedExams = true;
    } catch (examErr) {
      console.error("Error saving config to exams/whatsapp:", examErr);
    }

    // Also attempt settings/whatsapp as backup
    try {
      await setDoc(doc(db, "settings", "whatsapp"), {
        link: cleanLink,
        title: cleanTitle,
        noticeBody: cleanBody,
        buttonText: cleanButton,
        isActive: noticeIsActive,
      });
      savedSettings = true;
    } catch (settingsErr) {
      console.warn(
        "Could not save to settings collection (expected if firestore.rules are not deployed on external console):",
        settingsErr,
      );
    }

    if (savedExams || savedSettings) {
      alert("WhatsApp Notice updated successfully!");
    } else {
      alert("Failed to save. Please make sure database is active.");
    }
    setSavingWhatsappLink(false);
  };

  const handleSaveLandingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLandingSettings(true);

    const cleanTitle = adminLandingTitle.trim();
    const cleanDesc = adminLandingDescription.trim();

    let savedExams = false;
    let savedSettings = false;

    // Save to the always-writable exams collection with document ID 'landing'
    try {
      await setDoc(doc(db, "exams", "landing"), {
        title: "Landing Configuration",
        landingTitle: cleanTitle.substring(0, 200),
        landingDescription: cleanDesc.substring(0, 4000),
        price: 0,
        isActive: false,
        duration: 0,
      });
      savedExams = true;
    } catch (examErr) {
      console.error("Error saving config to exams/landing:", examErr);
    }

    // Try settings/landing as backup
    try {
      await setDoc(doc(db, "settings", "landing"), {
        landingTitle: cleanTitle.substring(0, 200),
        landingDescription: cleanDesc.substring(0, 4000),
      });
      savedSettings = true;
    } catch (settingsErr) {
      console.warn(
        "Could not save to settings collection (expected if firestore.rules are not deployed on external console):",
        settingsErr,
      );
    }

    if (savedExams || savedSettings) {
      alert("Landing page description saved and updated successfully!");
    } else {
      alert(
        "Failed to save settings: Firebase permissions or internet connectivity issues.",
      );
    }
    setSavingLandingSettings(false);
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentConfig(true);

    const cleanInstructions = adminPaymentInstructions.trim();
    const cleanNumber = adminPaymentNumber.trim();
    const cleanMethod = adminPaymentMethod.trim();

    let savedExams = false;
    let savedSettings = false;

    // Save to the always-writable exams collection with document ID 'payment'
    try {
      await setDoc(doc(db, "exams", "payment"), {
        title: "Payment configuration",
        paymentInstructions: cleanInstructions,
        paymentNumber: cleanNumber,
        paymentMethod: cleanMethod,
        price: 0,
        isActive: false,
        duration: 0,
      });
      savedExams = true;
    } catch (examErr) {
      console.error("Error saving config to exams/payment:", examErr);
    }

    // Try settings/payment as backup
    try {
      await setDoc(doc(db, "settings", "payment"), {
        paymentInstructions: cleanInstructions,
        paymentNumber: cleanNumber,
        paymentMethod: cleanMethod,
      });
      savedSettings = true;
    } catch (settingsErr) {
      console.warn(
        "Could not save to settings collection (expected if firestore.rules are not deployed on external console):",
        settingsErr,
      );
    }

    if (savedExams || savedSettings) {
      alert("Payment Configuration saved and updated successfully!");
    } else {
      alert(
        "Failed to save payment settings: Firebase permissions or internet connectivity issues.",
      );
    }
    setSavingPaymentConfig(false);
  };

  const handleSaveInstructions = async () => {
    if (userRole !== 'admin') {
      alert("Only the main Admin can edit instructions.");
      return;
    }
    setSavingInstructions(true);
    let savedExams = false;
    let savedSettings = false;

    try {
      await setDoc(doc(db, "exams", "instructions"), {
        title: "Exam Instructions",
        price: 0,
        isActive: true,
        duration: 0,
        steps: instructionSteps,
      });
      savedExams = true;
    } catch (examErr) {
      console.error("Error saving instructions to exams/instructions:", examErr);
    }

    try {
      await setDoc(doc(db, "settings", "instructions"), {
        steps: instructionSteps,
      });
      savedSettings = true;
    } catch (settingsErr) {
      console.warn("Could not save to settings/instructions collection:", settingsErr);
    }

    if (savedExams || savedSettings) {
      alert("Instructions saved successfully!");
    } else {
      alert("Failed to save instructions. Ensure your Firebase configuration has appropriate rules.");
    }
    setSavingInstructions(false);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const examId = `exam_${Date.now()}`;
      await setDoc(doc(db, "exams", examId), newExam);
      alert("Exam created successfully!");
      setNewExam({
        title: "",
        price: 0,
        duration: 180,
        isActive: false,
        totalQuestions: 200,
        startTime: "",
        endTime: "",
        leaderboardEnabled: true,
        isPaid: true,
      });
      fetchData();
    } catch (err) {
      console.error("Error creating exam", err);
      alert("Failed to create exam");
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return alert("Select an exam first");

    const options = [
      newQuestion.opt1,
      newQuestion.opt2,
      newQuestion.opt3,
      newQuestion.opt4,
    ];
    const correctVal =
      options[parseInt(newQuestion.correctAnswer.replace("opt", "")) - 1];

    try {
      const questionId = `q_${Date.now()}`;
      await setDoc(doc(db, "questions", questionId), {
        examId: selectedExamId,
        question: newQuestion.question,
        options: options,
        correctAnswer: correctVal,
        subject: newQuestion.subject,
      });
      alert("Question added successfully!");
      setNewQuestion({
        ...newQuestion,
        question: "",
        opt1: "",
        opt2: "",
        opt3: "",
        opt4: "",
      });
    } catch (err) {
      console.error("Error adding question", err);
      alert("Failed to add question");
    }
  };

  const handleBulkAddQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return alert("Select an exam first");

    try {
      // 1. Parse JSON safely
      let dataset: any;
      try {
        dataset = JSON.parse(bulkQuestions);
      } catch (parseErr: any) {
        return alert(
          `JSON Parse Error: ${parseErr.message}\nPlease make sure the JSON format is correct.`,
        );
      }

      // 2. Extract array of questions
      let questionsToUpload: any[] = [];
      let inferredSubject = bulkSubject;

      if (dataset && typeof dataset === "object" && !Array.isArray(dataset)) {
        if (Array.isArray(dataset.questions)) {
          questionsToUpload = dataset.questions;
        } else if (Array.isArray(dataset.data)) {
          questionsToUpload = dataset.data;
        } else {
          // Maybe it's a single question object
          questionsToUpload = [dataset];
        }

        // Infer subject if defined in root object
        if (dataset.subject) {
          inferredSubject = dataset.subject;
        }
      } else if (Array.isArray(dataset)) {
        questionsToUpload = dataset;
      }

      if (questionsToUpload.length === 0) {
        return alert(
          'Could not find any questions to upload. Ensure the JSON is a list of questions, or contains a "questions" array.',
        );
      }

      let successCount = 0;
      let skipCount = 0;
      const skipReasons: string[] = [];

      // 3. Process each question
      for (const q of questionsToUpload) {
        // Extract the question text
        const qText = q.question || q.text || q.questionText || q.title;
        if (!qText) {
          skipCount++;
          skipReasons.push("Missing text or 'question' field");
          continue;
        }

        // Extract Options: Support both options array or opt1-opt4 properties
        let options: string[] = [];
        
        if (Array.isArray(q.options)) {
          options = q.options.slice(0, 4).map((o: any) => String(o));
        } else if (q.options && typeof q.options === 'object') {
          // Support for options as an object mapping, e.g. {"A": "Option 1", "B": "Option 2"}
          options = Object.values(q.options).slice(0, 4).map((o: any) => String(o));
        } else if (
          q.opt1 !== undefined ||
          q.opt2 !== undefined
        ) {
          options = [
            q.opt1 !== undefined ? String(q.opt1) : "",
            q.opt2 !== undefined ? String(q.opt2) : "",
            q.opt3 !== undefined ? String(q.opt3) : "",
            q.opt4 !== undefined ? String(q.opt4) : "",
          ];
        } else {
          // Fallback
          options = ["", "", "", ""];
        }

        // Pad to ensure we always have 4 elements, but that's handled by Firebase schema (it's less strict as long as there are at least 2)
        while (options.length < 4) {
          options.push("");
        }

        // Validate that options have some content
        if (options.filter((o) => o.trim() !== "").length < 2) {
          skipCount++;
          skipReasons.push(
            `Question "${qText.substring(0, 20)}..." has too few options (at least 2 required)`,
          );
          continue;
        }

        // Extract and normalize correctAnswer
        const rawCorrect =
          q.correctAnswer !== undefined
            ? q.correctAnswer
            : q.correct || q.correct_answer || q.answer;
        let correctVal = "";

        if (rawCorrect !== undefined && rawCorrect !== null) {
          const rawStr = String(rawCorrect).trim();

          // Case A: "opt1", "opt2", "opt3", "opt4"
          if (/^opt[1-4]$/i.test(rawStr)) {
            const idx = parseInt(rawStr.toLowerCase().replace("opt", "")) - 1;
            correctVal = options[idx] || "";
          }
          // Case B: number 1, 2, 3, 4
          else if (/^[1-4]$/.test(rawStr)) {
            const idx = parseInt(rawStr) - 1;
            correctVal = options[idx] || "";
          }
          // Case C: A, B, C, D
          else if (/^[A-D]$/i.test(rawStr)) {
            const charCode = rawStr.toUpperCase().charCodeAt(0);
            const idx = charCode - 65; // A is 65
            correctVal = options[idx] || "";
          }
          // Case D: Exact string match
          else {
            const foundInOptions = options.find(
              (o) => o.toLowerCase() === rawStr.toLowerCase(),
            );
            if (foundInOptions) {
              correctVal = foundInOptions;
            } else {
              // Fallback to option 1 or raw text
              correctVal = options[0] || rawStr;
            }
          }
        } else {
          // Default fallback
          correctVal = options[0] || "";
        }

        // Determine Subject: prefer specific question subject -> root/document subject -> default bulk subject selection
        const questionSubject = q.subject || inferredSubject;

        // Generate ID and set document
        const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await setDoc(doc(db, "questions", questionId), {
          examId: selectedExamId,
          question: qText,
          options: options,
          correctAnswer: correctVal,
          subject: questionSubject,
        });
        successCount++;
      }

      let alertMessage = `Successfully uploaded ${successCount} questions!`;
      if (skipCount > 0) {
        alertMessage += `\nSkipped ${skipCount} questions because of invalid format/properties. Examples of errors:\n- ${Array.from(new Set(skipReasons)).slice(0, 3).join("\n- ")}`;
      }
      alert(alertMessage);
      setBulkQuestions("");
    } catch (err: any) {
      console.error("Error bulk adding questions", err);
      alert(`Critical error bulk adding questions: ${err.message || err}`);
    }
  };

  const handleUpdatePaymentStatus = async (
    paymentId: string,
    status: string,
  ) => {
    try {
      await updateDoc(doc(db, "payments", paymentId), { status });
      fetchData();
    } catch (err) {
      console.error("Error updating payment", err);
      alert("Failed to update payment");
    }
  };

  useEffect(() => {
    if (!previewExamId) {
      setPreviewQuestions([]);
      return;
    }
    const loadPreviewQuestions = async () => {
      setLoadingPreview(true);
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "questions"),
            where("examId", "==", previewExamId),
          ),
        );
        setPreviewQuestions(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (err) {
        console.error("Error loading preview questions", err);
      } finally {
        setLoadingPreview(false);
      }
    };
    loadPreviewQuestions();
  }, [previewExamId]);

  const handleSaveEditedQuestion = async () => {
    if (!editingQuestionId || !editingQuestionData) return;
    try {
      await updateDoc(doc(db, "questions", editingQuestionId), {
        question: editingQuestionData.question,
        options: editingQuestionData.options,
        correctAnswer: editingQuestionData.correctAnswer,
      });
      alert("Question updated successfully!");
      setEditingQuestionId(null);
      // Refresh preview questions
      setLoadingPreview(true);
      const snapshot = await getDocs(
        query(
          collection(db, "questions"),
          where("examId", "==", previewExamId),
        ),
      );
      setPreviewQuestions(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      );
      setLoadingPreview(false);
    } catch (err) {
      console.error("Error updating question", err);
      alert("Failed to update question");
    }
  };

  const handleToggleExamStatus = async (
    examId: string,
    currentStatus: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "exams", examId), { isActive: !currentStatus });
      fetchData();
    } catch (err) {
      console.error("Error toggling exam status", err);
      alert("Failed to toggle exam status");
    }
  };

  const handleToggleLeaderboard = async (
    examId: string,
    currentEnabled: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "exams", examId), {
        leaderboardEnabled: !currentEnabled,
      });
      fetchData();
    } catch (err) {
      console.error("Error toggling leaderboard status", err);
      alert("Failed to toggle leaderboard status");
    }
  };

  const handleDeactivatePermanently = async (examId: string) => {
    triggerConfirm(
      "Permanently Deactivate Exam",
      "Are you sure you want to permanently deactivate this exam? This will remove it from 'Live & Upcoming' list for students, but paid students can still access their results or unattempted references forever.",
      async () => {
        try {
          await updateDoc(doc(db, "exams", examId), {
            isPermanentlyDeactivated: true,
            isActive: false,
          });
          alert("Exam permanently deactivated successfully!");
          fetchData();
        } catch (err) {
          console.error("Error permanently deactivating exam", err);
          alert("Failed to permanently deactivate exam");
        }
      }
    );
  };

  const handleDeleteExam = async (examId: string) => {
    triggerConfirm(
      "Confirm Exam Deletion",
      "WARNING: Are you sure you want to PERMANENTLY DELETE this exam? It will be deleted from everywhere, including student previous results. This action cannot be undone.",
      async () => {
        try {
          await deleteDoc(doc(db, "exams", examId));
          alert("Exam deleted successfully from everywhere!");
          fetchData();
        } catch (err) {
          console.error("Error deleting exam", err);
          alert("Failed to delete exam");
        }
      }
    );
  };

  return (
    <div className="flex flex-col md:flex-row items-start min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col border-r border-slate-800 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center gap-2 mb-8 text-blue-400">
          <Shield className="w-6 h-6" />
          <h2 className="text-xl font-bold">Admin Panel</h2>
        </div>
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab("exams")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "exams" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <BookOpen className="w-5 h-5" /> Exams Mgmt
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "questions" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <FileQuestion className="w-5 h-5" /> Questions
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "payments" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <CreditCard className="w-5 h-5" /> Payments
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "users" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <Users className="w-5 h-5" /> Members
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "whatsapp" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <MessageSquare className="w-5 h-5" /> WhatsApp Notice
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab("landing")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "landing" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <Settings className="w-5 h-5" /> Landing Config
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab("payment_config")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "payment_config" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <CreditCard className="w-5 h-5" /> Payment Config
            </button>
          )}
          <button
            onClick={() => setActiveTab("instructions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "instructions" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            <ScrollText className="w-5 h-5" /> Exam Instructions
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-slate-50 p-4 sm:p-8 w-full min-w-0">
        <div className="max-w-5xl mx-auto">
          {/* Mobile Tab bar - horizontally scrollable */}
          <div className="md:hidden mb-6 flex overflow-x-auto gap-2 py-2 border-b border-slate-205 scrollbar-thin">
            <button
              onClick={() => setActiveTab("exams")}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "exams" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              Exams
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "questions" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "payments" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "users" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              Members
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab("whatsapp")}
                className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "whatsapp" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
              >
                WhatsApp link
              </button>
            )}
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab("landing")}
                className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "landing" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
              >
                Landing Config
              </button>
            )}
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab("payment_config")}
                className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "payment_config" ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
              >
                Payment Config
              </button>
            )}
            <button
              onClick={() => setActiveTab("instructions")}
              className={`whitespace-nowrap px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === "instructions" ? "bg-blue-600 text-white" : "bg-white text-slate-705 border border-slate-200"}`}
            >
              Instructions
            </button>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <h3 className="font-bold mb-1">Error Loading Data</h3>
              <p>{errorMsg}</p>
            </div>
          )}
          {loading && activeTab !== "questions" ? (
            <div className="text-center py-12 text-slate-500">
              Loading data...
            </div>
          ) : (
            <>
              {activeTab === "exams" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Manage Exams
                  </h2>

                  {/* Create Exam Form */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      Create New Exam
                    </h3>
                    <form
                      onSubmit={handleCreateExam}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          required
                          value={newExam.title}
                          onChange={(e) =>
                            setNewExam({ ...newExam, title: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Access Option
                        </label>
                        <select
                          value={newExam.isPaid !== false ? "paid" : "free"}
                          onChange={(e) => {
                            const pval = e.target.value === "paid";
                            setNewExam({
                              ...newExam,
                              isPaid: pval,
                              price: pval ? 100 : 0,
                            });
                          }}
                          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                        >
                          <option value="paid">Paid Exam</option>
                          <option value="free">Unpaid (Free) Exam</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Price (NPR)
                        </label>
                        <input
                          type="number"
                          required
                          disabled={newExam.isPaid === false}
                          value={newExam.isPaid !== false ? newExam.price : 0}
                          onChange={(e) =>
                            setNewExam({
                              ...newExam,
                              price: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Duration (mins)
                        </label>
                        <input
                          type="number"
                          required
                          value={newExam.duration}
                          onChange={(e) =>
                            setNewExam({
                              ...newExam,
                              duration: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Total Questions
                        </label>
                        <input
                          type="number"
                          required
                          value={newExam.totalQuestions}
                          onChange={(e) =>
                            setNewExam({
                              ...newExam,
                              totalQuestions: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Start Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={newExam.startTime}
                          onChange={(e) =>
                            setNewExam({
                              ...newExam,
                              startTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          End Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={newExam.endTime}
                          onChange={(e) =>
                            setNewExam({ ...newExam, endTime: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      <div className="flex flex-col gap-3 mt-4 md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newExam.isActive}
                            onChange={(e) =>
                              setNewExam({
                                ...newExam,
                                isActive: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Active / Live to students (Starts and ends as
                            configured)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newExam.leaderboardEnabled}
                            onChange={(e) =>
                              setNewExam({
                                ...newExam,
                                leaderboardEnabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <span className="text-sm font-medium text-slate-700">
                            Enable Leaderboard (Allow students to view ranks &
                            scores)
                          </span>
                        </label>
                      </div>
                      <div className="md:col-span-2 mt-4">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                        >
                          Create Exam
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Exam List */}
                  <div className="space-y-10">
                    {/* Paid Exams Section */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        Paid Mock Exams
                      </h3>
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Title
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Price
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Timing
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Status / Leaderboard
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {exams.filter((exam) => exam.isPaid !== false)
                              .length === 0 ? (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="px-6 py-4 text-center text-slate-500"
                                >
                                  No paid exams generated yet.
                                </td>
                              </tr>
                            ) : (
                              exams
                                .filter((exam) => exam.isPaid !== false)
                                .map((exam) => (
                                  <tr key={exam.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                      {exam.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                      Rs. {exam.price}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 space-y-1">
                                      {exam.startTime ? (
                                        <div>
                                          Start:{" "}
                                          {new Date(
                                            exam.startTime,
                                          ).toLocaleString()}
                                        </div>
                                      ) : null}
                                      {exam.endTime ? (
                                        <div>
                                          End:{" "}
                                          {new Date(
                                            exam.endTime,
                                          ).toLocaleString()}
                                        </div>
                                      ) : null}
                                      {!exam.startTime && !exam.endTime ? (
                                        <span className="text-gray-400">
                                          Anytime
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap space-y-1.5">
                                      <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">
                                          Status
                                        </span>
                                        {exam.isPermanentlyDeactivated ? (
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                            Permanently Deactivated
                                          </span>
                                        ) : (
                                          <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${exam.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                                          >
                                            {exam.isActive
                                              ? "Active"
                                              : "Inactive"}
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">
                                          Leaderboard
                                        </span>
                                        <span
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${exam.leaderboardEnabled !== false ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}
                                        >
                                          {exam.leaderboardEnabled !== false
                                            ? "On / Enabled"
                                            : "Off / Disabled"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs space-y-2">
                                      <div className="flex gap-2 flex-wrap">
                                        {!exam.isPermanentlyDeactivated && (
                                          <button
                                            onClick={() =>
                                              handleToggleExamStatus(
                                                exam.id,
                                                exam.isActive,
                                              )
                                            }
                                            className={`px-2.5 py-1 rounded text-white font-semibold transition-all ${exam.isActive ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                          >
                                            {exam.isActive
                                              ? "Deactivate"
                                              : "Activate"}
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleToggleLeaderboard(
                                              exam.id,
                                              exam.leaderboardEnabled !== false,
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded text-white font-semibold transition-all ${exam.leaderboardEnabled !== false ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-500 hover:bg-slate-600"}`}
                                        >
                                          Leaderboard:{" "}
                                          {exam.leaderboardEnabled !== false
                                            ? "Disable"
                                            : "Enable"}
                                        </button>
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        {!exam.isPermanentlyDeactivated && (
                                          <button
                                            onClick={() =>
                                              handleDeactivatePermanently(
                                                exam.id,
                                              )
                                            }
                                            className="px-2.5 py-1 rounded text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 font-semibold transition-all"
                                          >
                                            Deactivate Permanently
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteExam(exam.id)}
                                          disabled={userRole !== 'admin'}
                                          className={`px-2.5 py-1 rounded text-white font-semibold transition-all ${userRole === 'admin' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-300 cursor-not-allowed'}`}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Unpaid (Free) Exams Section */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Unpaid (Free) Mock Exams
                      </h3>
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                Title
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                Timing
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                Status / Leaderboard
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {exams.filter((exam) => exam.isPaid === false)
                              .length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-6 py-4 text-center text-slate-500"
                                >
                                  No free exams generated yet.
                                </td>
                              </tr>
                            ) : (
                              exams
                                .filter((exam) => exam.isPaid === false)
                                .map((exam) => (
                                  <tr key={exam.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                      {exam.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 space-y-1">
                                      {exam.startTime ? (
                                        <div>
                                          Start:{" "}
                                          {new Date(
                                            exam.startTime,
                                          ).toLocaleString()}
                                        </div>
                                      ) : null}
                                      {exam.endTime ? (
                                        <div>
                                          End:{" "}
                                          {new Date(
                                            exam.endTime,
                                          ).toLocaleString()}
                                        </div>
                                      ) : null}
                                      {!exam.startTime && !exam.endTime ? (
                                        <span className="text-gray-400">
                                          Anytime
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap space-y-1.5">
                                      <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">
                                          Status
                                        </span>
                                        {exam.isPermanentlyDeactivated ? (
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                            Permanently Deactivated
                                          </span>
                                        ) : (
                                          <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${exam.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                                          >
                                            {exam.isActive
                                              ? "Active"
                                              : "Inactive"}
                                          </span>
                                        )}
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider mb-0.5">
                                          Leaderboard
                                        </span>
                                        <span
                                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${exam.leaderboardEnabled !== false ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}
                                        >
                                          {exam.leaderboardEnabled !== false
                                            ? "On / Enabled"
                                            : "Off / Disabled"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs space-y-2">
                                      <div className="flex gap-2 flex-wrap">
                                        {!exam.isPermanentlyDeactivated && (
                                          <button
                                            onClick={() =>
                                              handleToggleExamStatus(
                                                exam.id,
                                                exam.isActive,
                                              )
                                            }
                                            className={`px-2.5 py-1 rounded text-white font-semibold transition-all ${exam.isActive ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                          >
                                            {exam.isActive
                                              ? "Deactivate"
                                              : "Activate"}
                                          </button>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleToggleLeaderboard(
                                              exam.id,
                                              exam.leaderboardEnabled !== false,
                                            )
                                          }
                                          className={`px-2.5 py-1 rounded text-white font-semibold transition-all ${exam.leaderboardEnabled !== false ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-500 hover:bg-slate-600"}`}
                                        >
                                          Leaderboard:{" "}
                                          {exam.leaderboardEnabled !== false
                                            ? "Disable"
                                            : "Enable"}
                                        </button>
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        {!exam.isPermanentlyDeactivated && (
                                          <button
                                            onClick={() =>
                                              handleDeactivatePermanently(
                                                exam.id,
                                              )
                                            }
                                            className="px-2.5 py-1 rounded text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 font-semibold transition-all"
                                          >
                                            Deactivate Permanently
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteExam(exam.id)}
                                          disabled={userRole !== 'admin'}
                                          className={`px-2.5 py-1 rounded text-white font-semibold transition-all ${userRole === 'admin' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-300 cursor-not-allowed'}`}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "questions" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Manage Questions
                  </h2>

                  {/* Bulk Upload Section */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      Bulk Upload Questions (JSON)
                    </h3>
                    <form
                      onSubmit={handleBulkAddQuestions}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Target Exam
                          </label>
                          <select
                            value={selectedExamId}
                            onChange={(e) => setSelectedExamId(e.target.value)}
                            required
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            {exams.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Subject
                          </label>
                          <select
                            value={bulkSubject}
                            onChange={(e) => setBulkSubject(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            <option value="Zoology">Zoology</option>
                            <option value="Botany">Botany</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="MAT">MAT</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          JSON Template
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                          Paste a JSON array of objects with keys: `question`,
                          `opt1`, `opt2`, `opt3`, `opt4`, `correctAnswer` (e.g.
                          "opt1").
                        </p>
                        <textarea
                          required
                          value={bulkQuestions}
                          onChange={(e) => setBulkQuestions(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md h-40 font-mono text-sm whitespace-pre"
                          placeholder={`[\n  {\n    "question": "Sample question?",\n    "opt1": "A",\n    "opt2": "B",\n    "opt3": "C",\n    "opt4": "D",\n    "correctAnswer": "opt1"\n  }\n]`}
                        ></textarea>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={exams.length === 0}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Upload JSON
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Manual Upload Section */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      Add Questions Manually
                    </h3>
                    <form onSubmit={handleAddQuestion} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Target Exam
                        </label>
                        <select
                          value={selectedExamId}
                          onChange={(e) => setSelectedExamId(e.target.value)}
                          required
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          {exams.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Subject
                        </label>
                        <select
                          value={newQuestion.subject}
                          onChange={(e) =>
                            setNewQuestion({
                              ...newQuestion,
                              subject: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="Zoology">Zoology</option>
                          <option value="Botany">Botany</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="MAT">MAT</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Question Text
                        </label>
                        <textarea
                          required
                          value={newQuestion.question}
                          onChange={(e) =>
                            setNewQuestion({
                              ...newQuestion,
                              question: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md h-24 whitespace-pre-wrap"
                        ></textarea>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Option 1
                          </label>
                          <input
                            type="text"
                            required
                            value={newQuestion.opt1}
                            onChange={(e) =>
                              setNewQuestion({
                                ...newQuestion,
                                opt1: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Option 2
                          </label>
                          <input
                            type="text"
                            required
                            value={newQuestion.opt2}
                            onChange={(e) =>
                              setNewQuestion({
                                ...newQuestion,
                                opt2: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Option 3
                          </label>
                          <input
                            type="text"
                            required
                            value={newQuestion.opt3}
                            onChange={(e) =>
                              setNewQuestion({
                                ...newQuestion,
                                opt3: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Option 4
                          </label>
                          <input
                            type="text"
                            required
                            value={newQuestion.opt4}
                            onChange={(e) =>
                              setNewQuestion({
                                ...newQuestion,
                                opt4: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border rounded-md"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Correct Answer
                        </label>
                        <select
                          value={newQuestion.correctAnswer}
                          onChange={(e) =>
                            setNewQuestion({
                              ...newQuestion,
                              correctAnswer: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-md bg-green-50"
                        >
                          <option value="opt1">Option 1</option>
                          <option value="opt2">Option 2</option>
                          <option value="opt3">Option 3</option>
                          <option value="opt4">Option 4</option>
                        </select>
                      </div>

                      <div className="pt-4 border-t">
                        <button
                          type="submit"
                          disabled={exams.length === 0}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add Question
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Preview Published Questions Section */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      Preview Published Questions
                    </h3>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Select Exam to Preview
                      </label>
                      <select
                        value={previewExamId}
                        onChange={(e) => setPreviewExamId(e.target.value)}
                        className="w-full md:w-1/2 px-3 py-2 border rounded-md"
                      >
                        <option value="">-- Select Exam --</option>
                        {exams.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {previewExamId &&
                      (loadingPreview ? (
                        <div className="text-sm text-slate-500">
                          Loading questions...
                        </div>
                      ) : previewQuestions.length === 0 ? (
                        <div className="text-sm text-slate-500">
                          No questions found for this exam.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="text-sm text-slate-600 mb-4">
                            Total Questions: {previewQuestions.length}
                          </div>
                          {previewQuestions.map((q, idx) => (
                            <div
                              key={q.id}
                              className="border border-slate-200 rounded-lg p-4 bg-slate-50 relative"
                            >
                              {editingQuestionId === q.id ? (
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700">
                                      Question Text
                                    </label>
                                    <textarea
                                      value={editingQuestionData.question}
                                      onChange={(e) =>
                                        setEditingQuestionData({
                                          ...editingQuestionData,
                                          question: e.target.value,
                                        })
                                      }
                                      rows={3}
                                      className="w-full px-3 py-2 border rounded-md"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {editingQuestionData.options.map(
                                      (opt: string, optIdx: number) => (
                                        <div key={optIdx}>
                                          <label className="block text-xs font-medium text-slate-700">
                                            Option{" "}
                                            {String.fromCharCode(65 + optIdx)}
                                          </label>
                                          <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => {
                                              const newOptions = [
                                                ...editingQuestionData.options,
                                              ];
                                              newOptions[optIdx] =
                                                e.target.value;
                                              let newCorrect =
                                                editingQuestionData.correctAnswer;
                                              if (
                                                editingQuestionData.correctAnswer ===
                                                editingQuestionData.options[
                                                  optIdx
                                                ]
                                              ) {
                                                newCorrect = e.target.value;
                                              }
                                              setEditingQuestionData({
                                                ...editingQuestionData,
                                                options: newOptions,
                                                correctAnswer: newCorrect,
                                              });
                                            }}
                                            className="w-full px-3 py-2 border rounded-md text-sm"
                                          />
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700">
                                      Correct Answer
                                    </label>
                                    <select
                                      value={editingQuestionData.correctAnswer}
                                      onChange={(e) =>
                                        setEditingQuestionData({
                                          ...editingQuestionData,
                                          correctAnswer: e.target.value,
                                        })
                                      }
                                      className="w-full px-3 py-2 border rounded-md"
                                    >
                                      {editingQuestionData.options.map(
                                        (opt: string, optIdx: number) => (
                                          <option key={optIdx} value={opt}>
                                            Option{" "}
                                            {String.fromCharCode(65 + optIdx)}:{" "}
                                            {opt}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <button
                                      onClick={() => setEditingQuestionId(null)}
                                      className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-md hover:bg-slate-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveEditedQuestion}
                                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                      Save Question
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="absolute top-4 right-4">
                                    <button
                                      onClick={() => {
                                        setEditingQuestionId(q.id);
                                        setEditingQuestionData({ ...q });
                                      }}
                                      className="px-3 py-1 bg-white border border-slate-300 text-slate-700 text-xs rounded-md shadow-sm font-medium hover:bg-slate-50 transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                  <div className="font-medium text-slate-900 mb-3 pr-16">
                                    <span className="text-slate-500 mr-2">
                                      Q{idx + 1}.
                                    </span>
                                    {q.question}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm ml-6">
                                    {q.options &&
                                      q.options.map(
                                        (opt: string, i: number) => (
                                          <div
                                            key={i}
                                            className={`p-2 rounded-md border ${q.correctAnswer === opt ? "bg-green-100 border-green-300 font-semibold" : "bg-white border-slate-200"} text-slate-700`}
                                          >
                                            {String.fromCharCode(65 + i)}. {opt}
                                          </div>
                                        ),
                                      )}
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === "payments" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Verify Payments
                    </h2>
                    <select
                      value={paymentExamFilter}
                      onChange={(e) => setPaymentExamFilter(e.target.value)}
                      className="px-4 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Exams</option>
                      {exams.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            Student / Exam
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            Screenshot
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            Transaction ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {payments.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-4 text-center text-sm text-slate-500"
                            >
                              No payments found.
                            </td>
                          </tr>
                        )}
                        {payments
                          .filter((payment) =>
                            paymentExamFilter
                              ? payment.examId === paymentExamFilter
                              : true,
                          )
                          .sort((a, b) => {
                            const nameA = users.find(u => u.id === a.studentId)?.name || a.studentId;
                            const nameB = users.find(u => u.id === b.studentId)?.name || b.studentId;
                            return nameA.localeCompare(nameB);
                          })
                          .map((payment) => {
                            const studentUser = users.find(
                              (u) => u.id === payment.studentId,
                            );
                            const examDetails = exams.find(
                              (e) => e.id === payment.examId,
                            );
                            return (
                              <tr key={payment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                  <div className="font-semibold text-slate-800">
                                    {studentUser?.name || payment.studentId}
                                  </div>
                                  <div className="text-[11px] text-blue-600 font-mono font-bold">
                                    Site ID:{" "}
                                    {studentUser?.studentId || "No Assigned ID"}
                                  </div>
                                  <div className="text-slate-500 text-xs">
                                    {examDetails?.title || payment.examId}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">
                                  {payment.transactionId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {payment.screenshot ? (
                                    <img
                                      src={payment.screenshot}
                                      alt="Receipt Thumbnail"
                                      className="w-10 h-10 object-cover rounded border border-slate-200 hover:scale-110 transition-transform duration-100 cursor-zoom-in"
                                      onClick={() =>
                                        setSelectedPaymentScreenshot({
                                          img: payment.screenshot,
                                          studentName:
                                            studentUser?.name ||
                                            "Unknown student",
                                          studentId:
                                            studentUser?.studentId ||
                                            "No Assigned ID",
                                          examTitle:
                                            examDetails?.title ||
                                            payment.examId,
                                          transactionId: payment.transactionId,
                                          id: payment.id,
                                          status: payment.status,
                                        })
                                      }
                                    />
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">
                                      No Screenshot
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${payment.status === "approved" ? "green" : payment.status === "rejected" ? "red" : "yellow"}-100 text-${payment.status === "approved" ? "green" : payment.status === "rejected" ? "red" : "yellow"}-800`}
                                  >
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {payment.status === "pending" && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          handleUpdatePaymentStatus(
                                            payment.id,
                                            "approved",
                                          )
                                        }
                                        className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded"
                                      >
                                        Grant Access
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleUpdatePaymentStatus(
                                            payment.id,
                                            "rejected",
                                          )
                                        }
                                        disabled={userRole !== 'admin'}
                                        className={`px-3 py-1 rounded transition-colors ${userRole === 'admin' ? 'text-red-600 hover:text-red-900 bg-red-50' : 'text-slate-400 bg-slate-100 cursor-not-allowed'}`}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        {payments.filter((payment) =>
                          paymentExamFilter
                            ? payment.examId === paymentExamFilter
                            : true,
                        ).length === 0 &&
                          payments.length > 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-6 py-4 text-center text-sm text-slate-500"
                              >
                                No payments found for this exam.
                              </td>
                            </tr>
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Registered Students
                    </h2>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by name..."
                        value={usersSearchQuery}
                        onChange={(e) => setUsersSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      Administrators
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {users
                            .filter(u => (u.name || "").toLowerCase().includes(usersSearchQuery.toLowerCase()))
                            .filter(u => u.role === 'admin' || u.role === 'co-admin')
                            .sort((a, b) => {
                              if (a.role === 'admin' && b.role !== 'admin') return -1;
                              if (a.role !== 'admin' && b.role === 'admin') return 1;
                              if (a.role === 'admin' && b.role === 'admin') return 0;
                              return (a.name || "").localeCompare(b.name || "");
                            })
                            .map((u) => (
                              <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{u.studentId || "N/A"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{u.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {u.role === 'admin' ? (
                                    <span className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-xs font-bold uppercase">Admin</span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs font-bold uppercase">Co-Admin</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  {u.role === 'co-admin' && userRole === 'admin' && (
                                    <button
                                      onClick={() => handleToggleAdminRole(u.id, u.role)}
                                      className="text-amber-600 hover:bg-amber-100 px-3 py-1 bg-amber-50 rounded font-semibold text-xs transition-colors"
                                    >
                                      Remove Role
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Students
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Student ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                              Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {users
                            .filter(u => (u.name || "").toLowerCase().includes(usersSearchQuery.toLowerCase()))
                            .filter(u => !u.role || u.role === 'student')
                            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                            .map((u) => (
                              <tr key={u.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                  {editingStudent?.id === u.id ? (
                                    <form onSubmit={handleUpdateStudentId} className="flex items-center gap-2">
                                      <input 
                                        type="text" 
                                        value={editingStudent.studentId}
                                        onChange={(e) => setEditingStudent({...editingStudent, studentId: e.target.value})}
                                        className="border border-slate-300 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:border-blue-500"
                                        autoFocus
                                      />
                                      <button type="submit" className="text-emerald-600 hover:text-emerald-700 font-bold text-xs">Save</button>
                                      <button type="button" onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">Cancel</button>
                                    </form>
                                  ) : (
                                    u.studentId || "N/A"
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                  {u.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {u.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {u.emailVerified ? (
                                    <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-xs font-bold uppercase">Verified</span>
                                  ) : (
                                    <span className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-xs font-bold uppercase">Unverified</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                  {editingStudent?.id !== u.id && (
                                    <div className="flex justify-end gap-2">
                                      {userRole === 'admin' && (
                                        <button
                                          onClick={() => handleToggleAdminRole(u.id, u.role)}
                                          className="text-indigo-600 hover:bg-indigo-100 px-3 py-1 bg-indigo-50 rounded font-semibold text-xs transition-colors"
                                        >
                                          Make Co-Admin
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleToggleVerification(u.id, u.emailVerified)}
                                        className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${u.emailVerified ? 'text-amber-600 hover:bg-amber-100 bg-amber-50' : 'text-emerald-600 hover:bg-emerald-100 bg-emerald-50'}`}
                                      >
                                        {u.emailVerified ? 'Unverify' : 'Verify'}
                                      </button>
                                      <button
                                        onClick={() => setEditingStudent({ id: u.id, name: u.name, studentId: u.studentId || "" })}
                                        disabled={userRole !== 'admin'}
                                        className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${userRole === 'admin' ? 'text-blue-600 hover:bg-blue-100 bg-blue-50' : 'text-slate-400 bg-slate-100 cursor-not-allowed'}`}
                                      >
                                        Edit ID
                                      </button>
                                      <button
                                        onClick={() => handleDeleteStudent(u.id)}
                                        disabled={userRole !== 'admin'}
                                        className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${userRole === 'admin' ? 'text-rose-600 hover:bg-rose-100 bg-rose-50' : 'text-slate-400 bg-slate-100 cursor-not-allowed'}`}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "whatsapp" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    WhatsApp Notice
                  </h2>
                  <p className="text-slate-500 mb-6 text-sm">
                    Customize the tournament prize distribution notice shown to
                    mock test students.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Settings Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Notice Configuration
                      </h3>

                      <form
                        onSubmit={handleSaveWhatsappLink}
                        className="space-y-5"
                      >
                        {/* Notice Toggle */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Notice Visibility State
                          </label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setNoticeIsActive(true)}
                              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 ${
                                noticeIsActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                                  : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${noticeIsActive ? "bg-emerald-500 animate-ping" : "bg-slate-350"}`}
                              ></span>
                              Show Notice (Active)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNoticeIsActive(false)}
                              className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 ${
                                !noticeIsActive
                                  ? "bg-rose-50 text-rose-700 border-rose-300 shadow-sm"
                                  : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              Hide Notice (Disabled)
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            Toggle whether the prize announcement banner is
                            active on the student board.
                          </p>
                        </div>

                        {/* Notice Title */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-slate-700">
                              Notice Title
                            </label>
                            <span
                              className={`text-[11px] font-mono ${noticeTitle.length > 200 ? "text-red-500" : "text-slate-400"}`}
                            >
                              {noticeTitle.length}/200
                            </span>
                          </div>
                          <input
                            type="text"
                            required
                            maxLength={200}
                            placeholder="e.g., CEE Mock Test Pro Notice"
                            value={noticeTitle}
                            onChange={(e) => setNoticeTitle(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400 transition-all"
                          />
                          <p className="text-xs text-slate-400 mt-1.5">
                            Must be under 200 characters to comply with data
                            safety guidelines.
                          </p>
                        </div>

                        {/* Notice Body */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Notice Text / Message
                          </label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Provide details about prize retrieval, rules, and mock test criteria..."
                            value={noticeBody}
                            onChange={(e) => setNoticeBody(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400 transition-all leading-relaxed"
                          />
                          <p className="text-xs text-slate-400 mt-1.5">
                            Clearly explain what students need to do (joining
                            instructions, deadlines, etc).
                          </p>
                        </div>

                        {/* WhatsApp Group Link */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            WhatsApp Group Link
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="e.g., https://chat.whatsapp.com/..."
                            value={whatsappLink}
                            onChange={(e) => setWhatsappLink(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400 transition-all font-mono text-[13px]"
                          />
                          <p className="text-xs text-slate-400 mt-1.5">
                            Provide the full link, including https://, of your
                            active channel or chat workspace.
                          </p>
                        </div>

                        {/* Button Text */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Button Action Text
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Join WhatsApp Group"
                            value={buttonText}
                            onChange={(e) => setButtonText(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400 transition-all"
                          />
                          <p className="text-xs text-slate-400 mt-1.5">
                            Call to action written inside the clickable notice
                            button. (e.g. Join WhatsApp Group, Get Prize Link)
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                          <button
                            type="submit"
                            disabled={savingWhatsappLink}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[130px]"
                          >
                            {savingWhatsappLink ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Live Preview Pane */}
                    <div className="space-y-4 sticky top-24">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
                          Live Real-time Student Preview
                        </span>
                        {!noticeIsActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 uppercase tracking-widest">
                            Currently Hidden
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-1 rounded-2xl bg-slate-100 border border-slate-200 ${!noticeIsActive && "opacity-60 bg-slate-50 border-dashed"}`}
                      >
                        <div className="bg-slate-50 p-3 rounded-t-xl border-b border-slate-200 text-xs font-semibold text-slate-500 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-red-400 rounded-full inline-block"></span>
                          <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full inline-block"></span>
                          <span className="w-2.5 h-2.5 bg-green-400 rounded-full inline-block"></span>
                          <span className="ml-1 tracking-tight font-mono text-[10px] text-slate-400">
                            student_dashboard_live_preview.component
                          </span>
                        </div>

                        <div className="bg-white p-6 rounded-b-xl min-h-[180px] flex items-center justify-center">
                          {noticeIsActive ? (
                            <div className="w-full bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-teal-50/50 border-2 border-emerald-500/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all w-full">
                              <div className="flex items-start gap-3.5">
                                <div className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/15 mt-0.5 animate-pulse">
                                  <MessageSquare className="w-5.5 h-5.5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight">
                                    Notice
                                  </h4>
                                  <p className="text-slate-650 text-[11px] sm:text-xs mt-1 leading-relaxed max-w-xl">
                                    {noticeBody ||
                                      "Attention Students: All tournament prizes for this mock test season will be distributed exclusively through the official WhatsApp group. Click the join link to stay eligible and receive direct updates."}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={whatsappLink || "#"}
                                onClick={(e) => e.preventDefault()}
                                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded-xl shadow-md transition-all text-center shrink-0 cursor-default"
                              >
                                {buttonText || "Join WhatsApp Group"}
                              </a>
                            </div>
                          ) : (
                            <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-250 rounded-xl w-full">
                              <p className="text-xs text-slate-400 font-medium">
                                Notice is currently marked inactive.
                              </p>
                              <p className="text-[10px] text-slate-350 mt-1">
                                Change "Notice Visibility State" to "Show
                                Notice" above to display the notification header
                                for students.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "landing" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Edit Landing Page Description
                  </h2>
                  <p className="text-slate-500 mb-6 text-sm">
                    Customize the title and beautiful description that students
                    see when they first visit this platform.
                  </p>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <form
                      onSubmit={handleSaveLandingSettings}
                      className="space-y-6"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Landing Page Display Title
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={200}
                          value={adminLandingTitle}
                          onChange={(e) => setAdminLandingTitle(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                          placeholder="Nepal's Premier CEE Mock Exam Platform"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            Beautiful Platform Description
                          </label>
                          <span className="text-[11px] font-mono text-slate-400">
                            {adminLandingDescription.length}/4000
                          </span>
                        </div>
                        <textarea
                          required
                          rows={6}
                          maxLength={4000}
                          value={adminLandingDescription}
                          onChange={(e) =>
                            setAdminLandingDescription(e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 leading-relaxed font-light"
                          placeholder="Provide a wonderful description on what the platform is for, the mock tests, learn capabilities, tournaments and potential prize rewards!"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                          Be sure to include details about: mock exam setup, the
                          learning opportunities, tournaments, and how students
                          can earn rewards and prizes by practicing their
                          questions!
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                          type="submit"
                          disabled={savingLandingSettings}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[130px]"
                        >
                          {savingLandingSettings
                            ? "Saving..."
                            : "Save Settings"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "payment_config" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Configure Student Payment Details
                  </h2>
                  <p className="text-slate-500 mb-6 text-sm">
                    Set up payment method, wallet details, and custom payment
                    instructions that students see before selecting mock exams.
                  </p>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <form
                      onSubmit={handleSavePaymentConfig}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Payment Method (e.g. eSewa, Khalti, IME Pay)
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={100}
                            value={adminPaymentMethod}
                            onChange={(e) =>
                              setAdminPaymentMethod(e.target.value)
                            }
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                            placeholder="eSewa"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Admin Wallet/Account Number
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={100}
                            value={adminPaymentNumber}
                            onChange={(e) =>
                              setAdminPaymentNumber(e.target.value)
                            }
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800"
                            placeholder="9822531607"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-semibold text-slate-700">
                            Custom Payment Instructions
                          </label>
                          <span className="text-[11px] font-mono text-slate-400">
                            Use{" "}
                            <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-600 font-bold">
                              {"{price}"}
                            </code>{" "}
                            to represent the target exam price dynamically.
                          </span>
                        </div>
                        <textarea
                          required
                          rows={6}
                          value={adminPaymentInstructions}
                          onChange={(e) =>
                            setAdminPaymentInstructions(e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-800 leading-relaxed font-light font-mono"
                          placeholder="Provide numerical steps or structural lines. Sample:&#10;1. Open eSewa&#10;2. Transfer Rs. {price} to 9822531607&#10;..."
                        />
                        <p className="text-xs text-slate-400 mt-2">
                          Students will read these exact instructions
                          word-for-word in their checkout portal, with{" "}
                          <code className="bg-slate-150 px-1 rounded font-bold">
                            {"{price}"}
                          </code>{" "}
                          automatically replaced with the respective Exam Price.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                          type="submit"
                          disabled={savingPaymentConfig}
                          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-600/10 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[130px]"
                        >
                          {savingPaymentConfig
                            ? "Saving..."
                            : "Save Configuration"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "instructions" && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Manage Exam Instructions
                  </h2>
                  <p className="text-slate-500 mb-6 text-sm">
                    Configure step-by-step instructions that students must read to prepare for and take the exams properly. You can attach guidance photos to each step.
                  </p>

                  {userRole !== 'admin' && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center gap-3">
                      <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold">
                        View Mode only: You are logged in as a Co-Admin. Only the main Admin can add, edit, or delete instruction steps.
                      </p>
                    </div>
                  )}

                  {/* Admin Help Categories Horizontal selector (Looks the same as Student view) */}
                  <div className="mb-8 bg-slate-50 p-5 rounded-3xl border border-slate-200">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-3">
                      Filter Editable Instructions by Category
                    </span>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        onClick={() => setAdminActiveFilter("all")}
                        className={`text-center py-3 px-4 rounded-2xl text-xs font-extrabold border transition-all ${
                          adminActiveFilter === "all"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        All Step Guidelines
                      </button>
                      <button
                        onClick={() => setAdminActiveFilter("account")}
                        className={`text-center py-3 px-4 rounded-2xl text-xs font-extrabold border transition-all ${
                          adminActiveFilter === "account"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Verification & ID
                      </button>
                      <button
                        onClick={() => setAdminActiveFilter("payment")}
                        className={`text-center py-3 px-4 rounded-2xl text-xs font-extrabold border transition-all ${
                          adminActiveFilter === "payment"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Payments & eSewa
                      </button>
                      <button
                        onClick={() => setAdminActiveFilter("exam")}
                        className={`text-center py-3 px-4 rounded-2xl text-xs font-extrabold border transition-all ${
                          adminActiveFilter === "exam"
                            ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Mock Exam Protocol
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {instructionSteps.length === 0 ? (
                      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
                        <ScrollText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-800 mb-1">No Instructions Set</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                          Create step-by-step guidance slides with text and screenshots to help students write exams with confidence.
                        </p>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => {
                              setInstructionSteps([
                                {
                                  id: `step_${Date.now()}`,
                                  title: "Verify Profile Information",
                                  description: "Before sitting for any exam, double check that your Student ID is properly updated in your 'My Account' profile.",
                                  photoUrl: "",
                                  category: "account"
                                }
                              ]);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                          >
                            <Plus className="w-4 h-4" /> Add First Step
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {instructionSteps
                          .map((step, originalIdx) => ({ step, originalIdx }))
                          .filter(({ step }) => {
                            const category = step.category ? step.category.toLowerCase() : "";
                            if (adminActiveFilter === "all") return true;
                            if (adminActiveFilter === "account") {
                              return category === "account" || (step.title && step.title.toLowerCase().includes("id")) || (step.title && step.title.toLowerCase().includes("verify"));
                            }
                            if (adminActiveFilter === "payment") {
                              return category === "payment" || (step.title && step.title.toLowerCase().includes("pay")) || (step.title && step.title.toLowerCase().includes("screenshot")) || (step.title && step.title.toLowerCase().includes("esewa"));
                            }
                            if (adminActiveFilter === "exam") {
                              return category === "exam" || (step.title && step.title.toLowerCase().includes("exam")) || (step.title && step.title.toLowerCase().includes("submit")) || (step.title && step.title.toLowerCase().includes("prepare"));
                            }
                            return true;
                          })
                          .map(({ step, originalIdx }, idx) => (
                            <div key={step.id || originalIdx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 relative group transition-all hover:border-slate-300">
                              {/* Step Order Column / Actions */}
                              <div className="flex md:flex-col items-center justify-between md:justify-start gap-2 shrink-0 md:border-r md:pr-6 border-slate-100">
                                <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest text-[11px]">
                                  Card {idx + 1}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  (Index: {originalIdx + 1})
                                </span>
                                {userRole === 'admin' && (
                                  <div className="flex md:flex-col gap-1.5 mt-2">
                                    <button
                                      disabled={originalIdx === 0}
                                      title="Move Up"
                                      onClick={() => {
                                        const updated = [...instructionSteps];
                                        const temp = updated[originalIdx];
                                        updated[originalIdx] = updated[originalIdx - 1];
                                        updated[originalIdx - 1] = temp;
                                        setInstructionSteps(updated);
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-transparent"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={originalIdx === instructionSteps.length - 1}
                                      title="Move Down"
                                      onClick={() => {
                                        const updated = [...instructionSteps];
                                        const temp = updated[originalIdx];
                                        updated[originalIdx] = updated[originalIdx + 1];
                                        updated[originalIdx + 1] = temp;
                                        setInstructionSteps(updated);
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-35 disabled:hover:bg-transparent"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      title="Delete Step"
                                      onClick={() => {
                                        if (confirm(`Remove this instruction step?`)) {
                                          setInstructionSteps(instructionSteps.filter((_, sIdx) => sIdx !== originalIdx));
                                        }
                                      }}
                                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Title & Description Fields */}
                              <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                      Step Subject / Action Title
                                    </label>
                                    <input
                                      type="text"
                                      disabled={userRole !== 'admin'}
                                      value={step.title || ""}
                                      onChange={(e) => {
                                        const updated = [...instructionSteps];
                                        updated[originalIdx].title = e.target.value;
                                        setInstructionSteps(updated);
                                      }}
                                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-800 focus:outline-none"
                                      placeholder="e.g., Step 1: Join the Official WhatsApp Group"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                      Help Category's Bucket
                                    </label>
                                    <select
                                      disabled={userRole !== 'admin'}
                                      value={step.category || "account"}
                                      onChange={(e) => {
                                        const updated = [...instructionSteps];
                                        updated[originalIdx].category = e.target.value;
                                        setInstructionSteps(updated);
                                      }}
                                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-800 focus:outline-none"
                                    >
                                      <option value="account">Verification & ID</option>
                                      <option value="payment">Payments & eSewa</option>
                                      <option value="exam">Mock Exam Protocol</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Action Instructions / Descriptions
                                  </label>
                                  <textarea
                                    rows={3}
                                    disabled={userRole !== 'admin'}
                                    value={step.description || ""}
                                    onChange={(e) => {
                                      const updated = [...instructionSteps];
                                      updated[originalIdx].description = e.target.value;
                                      setInstructionSteps(updated);
                                    }}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-slate-700 focus:outline-none leading-relaxed"
                                    placeholder="Provide step details clearly. Explain why this step matters and what students need to verify or click."
                                  />
                                </div>
                              </div>

                              {/* Photo / Image Attachment Area */}
                              <div className="w-full md:w-56 shrink-0 flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                  Step Guidance Photo
                                </span>

                                {step.photoUrl ? (
                                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-white">
                                    <img
                                      src={step.photoUrl}
                                      alt={`Step ${originalIdx + 1}`}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    {userRole === 'admin' && (
                                      <button
                                        onClick={() => {
                                          const updated = [...instructionSteps];
                                          updated[originalIdx].photoUrl = "";
                                          setInstructionSteps(updated);
                                        }}
                                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-md text-[10px] uppercase font-bold tracking-wider"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-slate-300 text-slate-400 rounded-lg aspect-video flex flex-col items-center justify-center p-3 text-center bg-white">
                                    <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                                    <span className="text-[10px] font-medium leading-tight">No guidance photo attached</span>
                                  </div>
                                )}

                                {userRole === 'admin' && (
                                  <div className="space-y-1.5 mt-1">
                                    <div className="relative">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        id={`photo-input-${originalIdx}`}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            if (file.size > 300 * 1024) {
                                              alert("Guidance photo must be smaller than 300KB to register successfully.");
                                              return;
                                            }
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                              const updated = [...instructionSteps];
                                              updated[originalIdx].photoUrl = reader.result as string;
                                              setInstructionSteps(updated);
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        }}
                                        className="hidden"
                                      />
                                      <label
                                        htmlFor={`photo-input-${originalIdx}`}
                                        className="w-full py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <Upload className="w-3 h-3" /> Upload Local Image
                                      </label>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="Or paste Image URL..."
                                        value={step.photoUrl && !step.photoUrl.startsWith("data:") ? step.photoUrl : ""}
                                        onChange={(e) => {
                                          const updated = [...instructionSteps];
                                          updated[originalIdx].photoUrl = e.target.value;
                                          setInstructionSteps(updated);
                                        }}
                                        className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] text-slate-805 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                        {userRole === 'admin' && (
                          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <button
                              onClick={() => {
                                setInstructionSteps([
                                  ...instructionSteps,
                                  {
                                    id: `step_${Date.now()}`,
                                    title: adminActiveFilter === "account" ? "New Verification Step" : adminActiveFilter === "payment" ? "New Payment Step" : adminActiveFilter === "exam" ? "New Exam Step" : "",
                                    description: "",
                                    photoUrl: "",
                                    category: adminActiveFilter === "all" ? "account" : adminActiveFilter
                                  }
                                ]);
                              }}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" /> Add Custom Step
                            </button>

                            <button
                              onClick={handleSaveInstructions}
                              disabled={savingInstructions}
                              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/15 disabled:opacity-50 min-w-[150px] flex items-center justify-center"
                            >
                              {savingInstructions ? "Saving Instructions..." : "Save Instructions"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Lightbox Screenshot Modal */}
      {selectedPaymentScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setSelectedPaymentScreenshot(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">
                  Verify Payment Receipt
                </h3>
                <p className="text-[11px] text-slate-400">
                  Review transfer receipt & transaction details
                </p>
              </div>
              <button
                onClick={() => setSelectedPaymentScreenshot(null)}
                className="text-slate-400 hover:text-slate-650 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="grid grid-cols-1 gap-4">
              {/* Receipt Image */}
              <div className="bg-slate-50 rounded-xl overflow-hidden border p-2 flex items-center justify-center max-h-[350px]">
                <img
                  src={selectedPaymentScreenshot.img}
                  alt="Receipt"
                  className="max-h-[330px] object-contain rounded shadow-inner"
                />
              </div>

              {/* Informative Grid */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 text-xs border">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-400 font-medium">
                    Student Name:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedPaymentScreenshot.studentName}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-400 font-medium">
                    Site Student ID:
                  </span>
                  <span className="font-mono text-blue-600 font-bold">
                    {selectedPaymentScreenshot.studentId}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-400 font-medium">
                    Exam Course:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedPaymentScreenshot.examTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">
                    Transaction ID:
                  </span>
                  <span className="font-mono text-slate-800 break-all bg-slate-100 px-1 rounded">
                    {selectedPaymentScreenshot.transactionId}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t">
              {selectedPaymentScreenshot.status === "pending" ? (
                <>
                  <button
                    onClick={async () => {
                      await handleUpdatePaymentStatus(
                        selectedPaymentScreenshot.id,
                        "approved",
                      );
                      setSelectedPaymentScreenshot(null);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-green-600/10 hover:scale-[1.02]"
                  >
                    Approve & Grant Access
                  </button>
                  <button
                    onClick={async () => {
                      if (userRole !== 'admin') return;
                      await handleUpdatePaymentStatus(
                        selectedPaymentScreenshot.id,
                        "rejected",
                      );
                      setSelectedPaymentScreenshot(null);
                    }}
                    disabled={userRole !== 'admin'}
                    className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-md ${userRole === 'admin' ? 'bg-red-600 hover:bg-red-800 text-white shadow-red-600/10 hover:scale-[1.02]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                  >
                    Reject Payment
                  </button>
                </>
              ) : (
                <div className="text-xs text-slate-500 flex items-center pr-2">
                  Already processed (Status:{" "}
                  <span className="font-bold ml-1 uppercase">
                    {selectedPaymentScreenshot.status}
                  </span>
                  )
                </div>
              )}
              <button
                onClick={() => setSelectedPaymentScreenshot(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-slate-100 transform scale-100 transition-all">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmState.title}</h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed whitespace-pre-wrap">{confirmState.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmState.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/15"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
