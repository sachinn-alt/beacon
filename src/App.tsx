import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  CheckCircle,
  Clock,
  Coins,
  Map,
  MapPin,
  MessageSquare,
  PlusCircle,
  Send,
  Sparkles,
  Trophy,
  Upload,
  User,
  X,
  MapPin as PinIcon,
  BarChart3,
  ListFilter,
  CheckCircle2,
  Shield,
  Sun,
  Moon,
  Share2,
  Check,
  ZoomIn
} from "lucide-react";
import { Report, DashboardInsights as InsightsType, LeaderboardUser } from "./types";
import InteractiveMap from "./components/InteractiveMap";
import DashboardInsights from "./components/DashboardInsights";
import Leaderboard from "./components/Leaderboard";
import AdminDashboard from "./components/AdminDashboard";


const BeaconLogo = ({ className = "w-5 h-5 text-white" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Concentric broadcast waves propagating outwards */}
    <path
      d="M12 2a10 10 0 0 1 10 10"
      className="animate-pulse"
      style={{ animationDuration: "1.5s", transformOrigin: "center" }}
      opacity="0.4"
      strokeWidth="1.5"
    />
    <path
      d="M12 6a6 6 0 0 1 6 6"
      className="animate-pulse"
      style={{ animationDuration: "1.2s", transformOrigin: "center" }}
      opacity="0.7"
      strokeWidth="2"
    />
    {/* Dynamic Signal Beam */}
    <path
      d="M4.5 16.5C3.5 15 3 13.5 3 12a9 9 0 0 1 9-9"
      opacity="0.4"
      strokeWidth="1.5"
    />
    {/* Locator Pin styled like a modern antenna tower */}
    <path
      d="M12 21s-6-4.5-6-9a6 6 0 0 1 12 0c0 4.5-6 9-6 9z"
      fill="currentColor"
      fillOpacity="0.25"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    {/* Inner Transmitter focal point */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" className="animate-ping" style={{ animationDuration: "2s" }} />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<"map" | "dashboard" | "leaderboard" | "admin">("map");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  // Data States
  const [reports, setReports] = useState<Report[]>([]);
  const [insights, setInsights] = useState<KeysOfInsights | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lightboxReport, setLightboxReport] = useState<Report | null>(null);

  // Auto-dismiss share toast notification
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Deep linking: Auto-select report from query parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportIdParam = params.get("report") || params.get("reportId");
    if (reportIdParam && reports.length > 0) {
      const match = reports.find((r) => r.id === reportIdParam);
      if (match) {
        setSelectedReportId(match.id);
        setActiveTab("map");
      }
    }
  }, [reports]);

  // ESC key listener to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxReport(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleShareReport = async (report: Report) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?report=${report.id}`;
    const shareData = {
      title: `Beacon Issue: ${report.title}`,
      text: `Beacon Alert! Help verify or track this hyperlocal issue: "${report.description}"`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setToastMessage("Issue details shared successfully with neighbors!");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Web Share failed:", err);
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setToastMessage("Link copied! Share it with your neighbors to build community verification.");
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        setToastMessage("Could not copy link automatically. Please share this URL: " + text);
      });
  };
  
  // New Report Form States
  const [newReportCoords, setNewReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  // AI Triage Visualizer State
  const [aiTriageResult, setAiTriageResult] = useState<{
    category: string;
    severity: number;
    justification: string;
    isValid: boolean;
    isDuplicate: boolean;
    linkedTicketId: string | null;
    aiReason: string;
  } | null>(null);

  // Filter State
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // User Gamification State (Persisted in localStorage)
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("community_hero_profile");
    if (saved) return JSON.parse(saved);
    return {
      name: "Anonymous Civic Hero",
      points: 120,
      reports: 1,
      verifications: 3,
    };
  });

  // Save profile to localStorage on change
  useEffect(() => {
    localStorage.setItem("community_hero_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  // Fetch all data
  const fetchAllData = async () => {
    try {
      const reportsRes = await fetch("/api/reports");
      const reportsData = await reportsRes.json();
      setReports(reportsData);

      const insightsRes = await fetch("/api/dashboard/insights");
      const insightsData = await insightsRes.json();
      setInsights(insightsData);

      const leaderboardRes = await fetch("/api/leaderboard");
      const leaderboardData = await leaderboardRes.json();
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error("Error loading server-side data:", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Center coordinate if Geolocation is permitted
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // If Geolocation is permitted, put a temporary report anchor ready
          setNewReportCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Fallback coordinate anchor (San Francisco center)
          setNewReportCoords({ lat: 37.7749, lng: -122.4194 });
        }
      );
    } else {
      setNewReportCoords({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  // Update Username in Leaderboard
  const handleUpdateUsername = (newName: string) => {
    setUserProfile((prev: any) => ({ ...prev, name: newName }));
    // Update local leaderboard matching entry
    setLeaderboard((prev) =>
      prev.map((u) => {
        if (u.name === userProfile.name) {
          return { ...u, name: newName };
        }
        return u;
      })
    );
  };

  // Image Upload handler (Base64 conversion)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop files handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setImageType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Map coordinate selection
  const handleMapClick = (lat: number, lng: number) => {
    setNewReportCoords({ lat, lng });
    setIsFormOpen(true);
  };

  // Form Submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !newReportCoords) return;

    setIsSubmitting(true);
    setAiTriageResult(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          latitude: newReportCoords.lat,
          longitude: newReportCoords.lng,
          imageBase64: attachedImage,
          imageType,
          creator: userProfile.name,
        }),
      });

      const data = await response.json();
      if (response.status === 403) {
        alert(data.error || "Your citizen account is restricted due to administrative policy violations.");
        setIsSubmitting(false);
        return;
      }
      if (data.success) {
        // Increment User Gamification State
        setUserProfile((prev: any) => ({
          ...prev,
          points: prev.points + 50, // +50 points for reporting!
          reports: prev.reports + 1,
        }));

        // Trigger AI Triage Overlay Result
        setAiTriageResult(data.aiAnalysis);
        
        // Reload all data from backend
        await fetchAllData();
        
        // Select the newly reported ticket
        setSelectedReportId(data.report.id);

        // Reset inputs
        setFormTitle("");
        setFormDescription("");
        setAttachedImage(null);
        setIsFormOpen(false);
      }
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify/Upvote issue
  const handleVerifyReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userProfile.name }),
      });

      const data = await response.json();
      if (response.status === 403) {
        alert(data.error || "Your citizen account is restricted due to administrative policy violations.");
        return;
      }
      if (data.success) {
        setUserProfile((prev: any) => ({
          ...prev,
          points: prev.points + 10, // +10 points for verifying!
          verifications: prev.verifications + 1,
        }));

        await fetchAllData();
      }
    } catch (err) {
      console.error("Error verifying report:", err);
    }
  };

  // Resolve or Progress Status (Authority simulation)
  const handleUpdateStatus = async (reportId: string, status: "In Progress" | "Resolved") => {
    try {
      const response = await fetch(`/api/reports/${reportId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: status === "Resolved" 
            ? "Issue resolved. Materials updated, pavement fully restored and verified by community crew."
            : "Municipal road crew has dispatched tools and started excavation work."
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Also award points for helping resolve!
        setUserProfile((prev: any) => ({
          ...prev,
          points: prev.points + 20,
        }));
        await fetchAllData();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Comment submission
  const handleCommentSubmit = async (e: React.FormEvent, reportId: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const author = commentAuthor.trim() || userProfile.name;

    try {
      const response = await fetch(`/api/reports/${reportId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text: commentText }),
      });

      const data = await response.json();
      if (response.status === 403) {
        alert(data.error || "Your citizen account is restricted due to administrative policy violations.");
        return;
      }
      if (data.success) {
        // Reward user points for leaving high value feedback
        setUserProfile((prev: any) => ({
          ...prev,
          points: prev.points + 20,
        }));

        setCommentText("");
        setCommentAuthor("");
        await fetchAllData();
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
    }
  };

  // Fetching the selected report details
  const selectedReport = reports.find((r) => r.id === selectedReportId);

  // Dynamic status-specific UI helpers
  const getStatusClass = (status: string) => {
    switch (status) {
      case "Reported": return "bg-orange-500/15 text-orange-400 border border-orange-500/30";
      case "Verified": return "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30";
      case "In Progress": return "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30";
      case "Resolved": return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
      default: return "bg-slate-500/15 text-slate-400 border border-slate-500/30";
    }
  };

  // Filtering reports
  const filteredReports = reports.filter((r) => {
    const matchCategory = categoryFilter === "All" || r.category === categoryFilter;
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchCategory && matchStatus;
  });

  return (
    <div className={`flex flex-col min-h-screen font-sans transition-colors duration-300 overflow-x-hidden ${theme === "dark" ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-900"}`}>
      {/* HEADER BAR */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-[1000] px-4 py-3.5 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-950/40 shadow-lg flex items-center justify-center">
              <BeaconLogo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight flex items-center gap-2 text-slate-800 dark:text-slate-100">
                Beacon
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full font-mono uppercase tracking-widest font-bold">
                  Active Area
                </span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Hyperlocal AI Infrastructure Triaging Platform</p>
            </div>
          </div>

          {/* Gamification Indicator & Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-sm">
              <Coins className="w-4 h-4 text-amber-500" />
              <div className="text-left">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Civic XP</p>
                <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{userProfile.points} PTS</p>
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 border border-slate-200 rounded-xl shadow-sm">
              {[
                { tab: "map", label: "Live Dashboard", icon: Map },
                { tab: "dashboard", label: "Resolution Metrics", icon: BarChart3 },
                { tab: "leaderboard", label: "Civic Heroes", icon: Trophy },
                { tab: "admin", label: "Admin Control", icon: Shield },
              ].map((item) => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === item.tab
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition shadow-sm flex items-center justify-center cursor-pointer h-9 w-9"
              title={theme === "light" ? "Switch to Dark Theme" : "Switch to Light Theme"}
            >
              {theme === "light" ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>
          </div>
        </div>
      </header>

      {/* CORE FRAME CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === "map" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-130px)] min-h-[500px]">
            {/* Left/Main Column - interactive Map and filtering */}
            <div className="lg:col-span-8 flex flex-col gap-4 h-full">
              {/* Filter Row */}
              <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center gap-2 text-xs">
                  <ListFilter className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Filter Map:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Pothole">Potholes</option>
                    <option value="Water Leakage">Water Leaks</option>
                    <option value="Damaged Streetlight">Broken Lamp</option>
                    <option value="Waste Management">Waste & Litter</option>
                    <option value="Public Transport/Transit Gap">Transit Gaps</option>
                    <option value="Other">Other Issues</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Verified">Verified</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Map grid block */}
              <div className="flex-1 min-h-[300px]">
                <InteractiveMap
                  reports={filteredReports}
                  selectedReportId={selectedReportId}
                  onSelectReport={setSelectedReportId}
                  onMapClick={handleMapClick}
                  newReportCoords={newReportCoords}
                  theme={theme}
                />
              </div>
            </div>

            {/* Right/Side Column - Details OR Reporting Form */}
            <div className="lg:col-span-4 flex flex-col h-full overflow-hidden">
              <AnimatePresence mode="wait">
                {isFormOpen ? (
                  /* reporting form */
                  <motion.div
                    key="report-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-lg relative"
                  >
                    <button
                      onClick={() => setIsFormOpen(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-indigo-600" />
                      Report Local Hazard
                    </h3>
                    
                    <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <PinIcon className="w-3 h-3 text-red-500" />
                      COORD: {newReportCoords?.lat.toFixed(6)}, {newReportCoords?.lng.toFixed(6)}
                    </div>

                    <form onSubmit={handleSubmitReport} className="mt-4 flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Title / Brief Issue</label>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="e.g. Broken water main, Deep pothole near curb"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Description</label>
                        <textarea
                          required
                          rows={4}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Provide details. What is the impact? Why is it a safety issue?"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                        />
                      </div>

                      {/* File upload with Drag & Drop */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Attach Media Photo</label>
                        <div
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          className="border border-dashed border-slate-300 hover:border-indigo-500/50 bg-slate-50 rounded-xl p-4 text-center cursor-pointer transition-colors relative group"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          {attachedImage ? (
                            <div className="relative w-full h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                              <img src={attachedImage} alt="Attachment" className="h-full object-contain" />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachedImage(null);
                                }}
                                className="absolute top-1 right-1 bg-slate-900/80 p-1.5 rounded-full text-white hover:text-slate-200 border border-slate-800"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="py-2">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto group-hover:text-indigo-600 transition-colors" />
                              <p className="text-[11px] font-bold text-slate-600 mt-2">Drag and drop file or click to browse</p>
                              <p className="text-[9px] text-slate-400 mt-1">Supports PNG, JPG (Max 5MB)</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin"></div>
                            <span>Gemini Triaging Ticket...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>File Issue Report (+50 PTS)</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                ) : selectedReport ? (
                  /* Issue details panel */
                  <motion.div
                    key="report-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-lg overflow-y-auto"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full font-mono uppercase tracking-wider ${getStatusClass(selectedReport.status)}`}>
                          {selectedReport.status}
                        </span>
                        <h3 className="font-display font-bold text-slate-800 text-sm mt-1.5 leading-tight">{selectedReport.title}</h3>
                        <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          {new Date(selectedReport.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">Severity</span>
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 mt-1">
                          <AlertTriangle className={`w-3.5 h-3.5 ${selectedReport.severity >= 4 ? "text-red-500 animate-pulse" : "text-amber-500"}`} />
                          <span className="text-xs font-bold font-mono text-slate-800">{selectedReport.severity}/5</span>
                        </div>
                      </div>
                    </div>

                    {/* Content / Body */}
                    <div className="py-4 space-y-4 flex-1">
                      {selectedReport.imageUrl && (
                        <div 
                          id="report-image-lightbox-trigger"
                          onClick={() => setLightboxReport(selectedReport)}
                          className="group/image rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-100 max-h-[150px] bg-slate-50 flex items-center justify-center relative cursor-pointer active:scale-95 transition-all duration-200 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(248,250,252,1)]"
                          title="View image in fullscreen lightbox"
                        >
                          <img src={selectedReport.imageUrl} alt={selectedReport.title} className="w-full object-cover max-h-[150px] transition-transform duration-300 group-hover/image:scale-105" />
                          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 text-white">
                            <ZoomIn className="w-5 h-5 text-indigo-400 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-100">Click to Expand</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Citizen Description</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedReport.description}</p>
                      </div>

                      {/* AI triaged response block */}
                      <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl space-y-2 shadow-sm">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                          <span>Gemini AI Analyst Insight</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-normal italic">
                          "{selectedReport.justification}"
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] border-t border-indigo-100 font-mono text-slate-500">
                          <div>
                            <span className="text-slate-400 uppercase font-bold text-[9px] block">Category Tag</span>
                            <span className="text-indigo-700 font-bold">{selectedReport.category}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase font-bold text-[9px] block">Spam Validation</span>
                            <span className={selectedReport.isValid ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                              {selectedReport.isValid ? "PASSED VALID" : "SPAM / FAKE"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Verifications panel */}
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verifications</p>
                          <p className="text-xs font-bold font-mono text-slate-800 mt-0.5">{selectedReport.upvotes} Neighbors verified</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            id="share-issue-panel-btn"
                            onClick={() => handleShareReport(selectedReport)}
                            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer hover:bg-slate-50 active:scale-95"
                            title="Share issue details or copy public link"
                          >
                            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Share</span>
                          </button>
                          <button
                            onClick={() => handleVerifyReport(selectedReport.id)}
                            disabled={selectedReport.verifiedBy.includes(userProfile.name)}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span>{selectedReport.verifiedBy.includes(userProfile.name) ? "Verified" : "Verify (+10 PTS)"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Admin panel simulation */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Simulate Municipal Response</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(selectedReport.id, "In Progress")}
                            disabled={selectedReport.status === "In Progress" || selectedReport.status === "Resolved"}
                            className="flex-1 bg-white border border-slate-200 hover:border-indigo-200 disabled:border-slate-100 disabled:text-slate-400 text-indigo-600 text-[10px] font-bold py-1.5 rounded-lg transition-all shadow-sm"
                          >
                            Dispatch Crew
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedReport.id, "Resolved")}
                            disabled={selectedReport.status === "Resolved"}
                            className="flex-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 text-emerald-700 text-[10px] font-bold py-1.5 rounded-lg transition-all shadow-sm"
                          >
                            Resolve Issue
                          </button>
                        </div>
                      </div>

                      {/* Comments / Neighborhood Chat */}
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                          Neighborhood Intel ({selectedReport.comments.length})
                        </h4>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {selectedReport.comments.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-2 italic">No neighborhood updates yet. Share intel below.</p>
                          ) : (
                            selectedReport.comments.map((comm) => (
                              <div key={comm.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 text-[11px]">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                  <span>{comm.author}</span>
                                  <span>{new Date(comm.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                </div>
                                <p className="text-slate-600 leading-normal">{comm.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Comment Form */}
                        <form onSubmit={(e) => handleCommentSubmit(e, selectedReport.id)} className="flex gap-2 mt-2">
                          <input
                            type="text"
                            required
                            placeholder="Add community details... (+20 PTS)"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* default onboarding instruction state */
                  <motion.div
                    key="no-selection"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white border border-slate-200 rounded-2xl p-6 text-center flex flex-col justify-center items-center h-full shadow-lg"
                  >
                    <div className="p-4 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                      <Map className="w-8 h-8" />
                    </div>
                    <h3 className="font-display font-bold text-slate-800 mt-4">Select or Map an Issue</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs">
                      Explore reported infrastructure issues by clicking on any map indicator, or click anywhere directly on the map grid to lock coordinates and report a new issue.
                    </p>
                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Report New Incident
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && insights && (
          <div className="h-full">
            <DashboardInsights insights={insights} />
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="h-full">
            <Leaderboard
              users={leaderboard}
              userProfile={userProfile}
              onUpdateUsername={handleUpdateUsername}
            />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="h-full">
            <AdminDashboard
              reports={reports}
              onDataChanged={fetchAllData}
            />
          </div>
        )}
      </main>

      {/* AI TRIAGE OVERLAY DIALOG */}
      <AnimatePresence>
        {aiTriageResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              {/* Background accent ring */}
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-50 border border-indigo-100 blur-2xl" />

              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="font-display font-bold text-slate-800 text-sm">Gemini Real-Time AI Triage Complete</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Assessed Category</span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">{aiTriageResult.category}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Severity Rating</span>
                    <span className="text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md">{aiTriageResult.severity}/5</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-4 leading-normal italic text-center">
                    "{aiTriageResult.justification}"
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Validity Check</span>
                    <span className={aiTriageResult.isValid ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                      {aiTriageResult.isValid ? "Passed Integrity Check" : "Flagged Spam"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Duplicate Check</span>
                    <span className={aiTriageResult.isDuplicate ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                      {aiTriageResult.isDuplicate ? "Duplicate Identified" : "Unique Ticket Created"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal border-t border-slate-200 pt-2 font-mono">
                    {aiTriageResult.aiReason}
                  </p>
                </div>

                {aiTriageResult.isDuplicate && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800">Potential Duplicate Tagged</h4>
                      <p className="text-[10px] text-amber-600 mt-0.5 leading-normal">
                        This issue matches a nearby report of the same category. Neighborhood votes will be automatically consolidated into the primary ticket to maximize priority.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setAiTriageResult(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                >
                  Confirm & View Active Grid
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700/50 backdrop-blur-md"
          >
            <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN LIGHTBOX OVERLAY */}
      <AnimatePresence>
        {lightboxReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setLightboxReport(null)}
          >
            {/* Close Button */}
            <button
              id="lightbox-close-btn"
              onClick={() => setLightboxReport(null)}
              className="absolute top-4 right-4 z-[10001] bg-slate-900 border-2 border-slate-700 hover:border-white text-white p-2.5 rounded-xl transition-all cursor-pointer active:scale-90 shadow-lg"
              title="Close Full-screen View"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Lightbox Card */}
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()} // Prevent click-through closing
              className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-3xl border-3 border-slate-950 dark:border-slate-50 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(248,250,252,1)] overflow-hidden flex flex-col"
            >
              {/* Image Section */}
              <div className="w-full relative bg-slate-950 flex items-center justify-center min-h-[250px] max-h-[60vh] md:max-h-[70vh] overflow-hidden">
                <img
                  src={lightboxReport.imageUrl}
                  alt={lightboxReport.title}
                  className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain select-none"
                />
                
                {/* Visual beacon effect in the corner */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-600/90 text-white font-mono text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full font-bold border border-indigo-400">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>Beacon Asset Intel</span>
                </div>
              </div>

              {/* Caption details bottom panel */}
              <div className="p-5 border-t-3 border-slate-950 dark:border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/40">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider badge-3d ${getStatusClass(lightboxReport.status)}`}>
                      {lightboxReport.status}
                    </span>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-400 text-slate-700 dark:text-slate-300">
                      {lightboxReport.category}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 font-mono">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Severity {lightboxReport.severity}/5
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-bold font-display tracking-tight text-slate-800 dark:text-slate-100">
                    {lightboxReport.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-prose">
                    {lightboxReport.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  <button
                    id="share-issue-lightbox-btn"
                    onClick={() => {
                      handleShareReport(lightboxReport);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    title="Share this report"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                    <span>Share Issue</span>
                  </button>
                  <button
                    onClick={() => setLightboxReport(null)}
                    className="bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Temporary Local Interface for simple typing of Aggregate Insights
interface KeysOfInsights {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  avgSeverity: number;
  resolvedCount: number;
  hotspots: Array<{ lat: number; lng: number; severity: number; title: string }>;
}
