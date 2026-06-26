import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  UserX,
  UserCheck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Sliders,
  Sparkles,
  ChevronDown,
  Info,
  Download
} from "lucide-react";
import { Report } from "../types";

interface AdminDashboardProps {
  reports: Report[];
  onDataChanged: () => Promise<void>;
}

interface AdminAnalytics {
  totalReports: number;
  resolvedCount: number;
  avgResolutionTimeHours: number;
  resolutionHoursByCategory: Record<string, number>;
  validationStats: {
    duplicates: number;
    spam: number;
    valid: number;
  };
  reportsByCategory: Record<string, number>;
  severityCounts: Record<number, number>;
}

export default function AdminDashboard({ reports, onDataChanged }: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"reports" | "users" | "analytics">("reports");
  
  // States for Reports Manager
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Ban User States
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [userInputToBan, setUserInputToBan] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [banError, setBanError] = useState("");
  const [banSuccessMessage, setBanSuccessMessage] = useState("");

  // Analytics States
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load Admin Data (Banned Users & Analytics)
  const loadAdminData = async () => {
    try {
      setIsFetchingAnalytics(true);
      // Fetch banned users
      const banRes = await fetch("/api/admin/banned-users");
      if (banRes.ok) {
        const banData = await banRes.json();
        setBannedUsers(banData.bannedUsers || []);
      }

      // Fetch advanced analytics
      const analyticsRes = await fetch("/api/admin/analytics");
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error("Error loading admin information:", err);
    } finally {
      setIsFetchingAnalytics(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [reports]);

  // Show status feedback briefly
  const triggerFeedback = (type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4000);
  };

  // Administrative Status Change
  const handleAdminStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          note: `System Administrator updated ticket status to ${newStatus}.`
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("success", `Ticket status successfully changed to ${newStatus}`);
        await onDataChanged();
      } else {
        triggerFeedback("error", data.error || "Failed to update status");
      }
    } catch (err) {
      triggerFeedback("error", "Network failure while updating status");
      console.error(err);
    }
  };

  // Administrative Category Change
  const handleAdminCategoryChange = async (reportId: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory })
      });
      const data = await res.json();
      if (data.success) {
        triggerFeedback("success", `Issue successfully re-categorized as ${newCategory}`);
        await onDataChanged();
      } else {
        triggerFeedback("error", data.error || "Failed to update category");
      }
    } catch (err) {
      triggerFeedback("error", "Network error updating category");
      console.error(err);
    }
  };

  // Ban User Handler
  const handleBanUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInputToBan.trim()) return;

    setIsBanning(true);
    setBanError("");
    setBanSuccessMessage("");

    try {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userInputToBan.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBannedUsers(data.bannedUsers);
        setBanSuccessMessage(`User "${userInputToBan}" has been blacklisted and blocked from writing reports, comments, or verifications.`);
        setUserInputToBan("");
        await onDataChanged();
      } else {
        setBanError(data.error || "Failed to ban user");
      }
    } catch (err) {
      setBanError("Network error while submitting ban request");
    } finally {
      setIsBanning(false);
    }
  };

  // Unban User Handler
  const handleUnbanUser = async (username: string) => {
    try {
      const res = await fetch("/api/admin/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBannedUsers(data.bannedUsers);
        triggerFeedback("success", `User "${username}" unbanned and restored to active community status.`);
        await onDataChanged();
      }
    } catch (err) {
      console.error("Failed to unban user", err);
    }
  };

  // Export current filtered list as CSV
  const handleExportCSV = () => {
    const reportsToExport = filteredAdminReports;
    if (reportsToExport.length === 0) {
      triggerFeedback("error", "No reports match current filters. Try resetting search or filters to export.");
      return;
    }

    // Set up standard headers for external auditing/reporting
    const headers = [
      "Report ID",
      "Creator",
      "Title",
      "Description",
      "Category",
      "Severity (1-5)",
      "Justification",
      "Status",
      "Latitude",
      "Longitude",
      "Created At",
      "Upvotes",
      "Verification Count",
      "Is Valid",
      "Is Duplicate",
      "Linked Ticket ID"
    ];

    // Helper to escape double quotes and wrap complex strings in quotes to prevent CSV injection issues
    const cleanCSVField = (val: any) => {
      if (val === undefined || val === null) return "";
      let str = String(val).trim();
      str = str.replace(/"/g, '""');
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str}"`;
      }
      return str;
    };

    const csvRows = [headers.join(",")];

    reportsToExport.forEach((report) => {
      const row = [
        cleanCSVField(report.id),
        cleanCSVField(report.creator || "Anonymous Civic Hero"),
        cleanCSVField(report.title),
        cleanCSVField(report.description),
        cleanCSVField(report.category),
        cleanCSVField(report.severity),
        cleanCSVField(report.justification),
        cleanCSVField(report.status),
        cleanCSVField(report.latitude),
        cleanCSVField(report.longitude),
        cleanCSVField(report.createdAt),
        cleanCSVField(report.upvotes),
        cleanCSVField(report.verifiedBy?.length || 0),
        cleanCSVField(report.isValid ? "TRUE" : "FALSE"),
        cleanCSVField(report.isDuplicate ? "TRUE" : "FALSE"),
        cleanCSVField(report.linkedTicketId || "")
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `beacon_reports_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    triggerFeedback("success", `Exported ${reportsToExport.length} reports to CSV successfully!`);
  };

  // Filter reports
  const filteredAdminReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.id && r.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.creator && r.creator.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || r.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Extract unique authors/creators from reports and comments to suggest banning
  const activeCommunityUsers = Array.from(
    new Set([
      ...reports.map((r) => r.creator || "Anonymous Civic Hero"),
      ...reports.flatMap((r) => r.comments?.map((c) => c.author) || [])
    ])
  ).filter((user) => user !== "Anonymous Civic Hero" && !bannedUsers.includes(user));

  // Category and Status Colors
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "Pothole": return "bg-orange-50 text-orange-700 border border-orange-200";
      case "Water Leakage": return "bg-cyan-50 text-cyan-700 border border-cyan-200";
      case "Damaged Streetlight": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "Waste Management": return "bg-pink-50 text-pink-700 border border-pink-200";
      case "Public Transport/Transit Gap": return "bg-purple-50 text-purple-700 border border-purple-200";
      default: return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Reported": return "bg-orange-50 text-orange-600 border border-orange-200";
      case "Verified": return "bg-cyan-50 text-cyan-600 border border-cyan-200";
      case "In Progress": return "bg-indigo-50 text-indigo-600 border border-indigo-200";
      case "Resolved": return "bg-emerald-50 text-emerald-600 border border-emerald-200";
      default: return "bg-slate-50 text-slate-600 border border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/15 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              Administrative Core
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight">Beacon Control Dashboard</h2>
            <p className="text-xs text-slate-400">
              Review hyperlocal reports, manual overrides, community content policy, and resolution analytics.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border border-indigo-500/50 shadow-md cursor-pointer"
              title="Export filtered reports to CSV format"
            >
              <Download className="w-3.5 h-3.5" />
              Export to CSV
            </button>
            <button
              onClick={loadAdminData}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-slate-200 px-3 py-1.5 rounded-xl text-xs transition border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Data
            </button>
          </div>
        </div>

        {/* Status Feedback Notice */}
        <AnimatePresence>
          {actionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`absolute top-4 right-4 max-w-sm p-3 rounded-xl border shadow-lg text-xs font-semibold flex items-center gap-2 ${
                actionFeedback.type === "success"
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                  : "bg-red-950 text-red-300 border-red-900"
              }`}
            >
              {actionFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span>{actionFeedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admin Nav Sub-tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: "reports", label: "Reports Manager", icon: Sliders },
          { id: "users", label: "User Moderation & Bans", icon: UserX },
          { id: "analytics", label: "Resolution Analytics", icon: Clock }
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-sm font-semibold transition ${
              activeSubTab === subTab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <subTab.icon className="w-4 h-4" />
            {subTab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB CONTENTS */}
      <div className="min-h-[400px]">
        {/* TAB 1: REPORTS MANAGER */}
        {activeSubTab === "reports" && (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by title, description, or creator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="flex gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-600 w-1/2 md:w-auto justify-between">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    <option value="Pothole">Potholes</option>
                    <option value="Water Leakage">Water Leakage</option>
                    <option value="Damaged Streetlight">Streetlights</option>
                    <option value="Waste Management">Waste</option>
                    <option value="Public Transport/Transit Gap">Public Transport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-600 w-1/2 md:w-auto justify-between">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Verified">Verified</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reports List Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Creator</th>
                      <th className="py-3 px-4">Triage (AI Rating)</th>
                      <th className="py-3 px-4">Validation</th>
                      <th className="py-3 px-4">Admin Status Override</th>
                      <th className="py-3 px-4">Manual Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAdminReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                          No matching community reports found.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminReports.map((report) => {
                        const isExpanded = selectedReportId === report.id;
                        return (
                          <React.Fragment key={report.id}>
                            <tr
                              className={`hover:bg-slate-50/50 cursor-pointer transition ${
                                isExpanded ? "bg-indigo-50/15" : ""
                              }`}
                              onClick={() => setSelectedReportId(isExpanded ? null : report.id)}
                            >
                              <td className="py-3.5 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                      {report.id}
                                    </span>
                                    <span className="font-semibold text-slate-800 line-clamp-1 max-w-[180px]">
                                      {report.title}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    {new Date(report.createdAt).toLocaleDateString()} at{" "}
                                    {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">
                                <span className={bannedUsers.includes(report.creator || "Anonymous Civic Hero") ? "text-red-500 line-through font-semibold" : ""}>
                                  {report.creator || "Anonymous Civic Hero"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getCategoryBadgeClass(report.category)}`}>
                                    {report.category}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    S:{report.severity}/5
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col gap-1">
                                  {!report.isValid ? (
                                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-150 px-2 py-0.5 rounded-full text-[10px] font-semibold w-max">
                                      <XCircle className="w-3 h-3" /> Spam/Fake
                                    </span>
                                  ) : report.isDuplicate ? (
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-150 px-2 py-0.5 rounded-full text-[10px] font-semibold w-max">
                                      <AlertTriangle className="w-3 h-3" /> Duplicate
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-150 px-2 py-0.5 rounded-full text-[10px] font-semibold w-max">
                                      <CheckCircle2 className="w-3 h-3" /> Genuine
                                    </span>
                                  )}
                                  {report.upvotes > 0 && (
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {report.upvotes} validations
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={report.status}
                                  onChange={(e) => handleAdminStatusChange(report.id, e.target.value)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border focus:outline-none cursor-pointer ${getStatusBadgeClass(report.status)}`}
                                >
                                  <option value="Reported">Reported</option>
                                  <option value="Verified">Verified</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Resolved">Resolved</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={report.category}
                                  onChange={(e) => handleAdminCategoryChange(report.id, e.target.value)}
                                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="Pothole">Pothole</option>
                                  <option value="Water Leakage">Water Leakage</option>
                                  <option value="Damaged Streetlight">Streetlight</option>
                                  <option value="Waste Management">Waste Management</option>
                                  <option value="Public Transport/Transit Gap">Public Transport</option>
                                  <option value="Other">Other</option>
                                </select>
                              </td>
                            </tr>

                            {/* Collapsible expansion detail */}
                            {isExpanded && (
                              <tr className="bg-slate-50/50">
                                <td colSpan={6} className="py-4 px-6 border-b border-slate-100">
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600"
                                  >
                                    <div className="space-y-1.5 md:col-span-2">
                                      <p className="font-semibold text-slate-800">Report Description:</p>
                                      <p className="bg-white border border-slate-200/60 p-3 rounded-xl leading-relaxed text-slate-600">
                                        {report.description}
                                      </p>
                                      {report.justification && (
                                        <div className="bg-indigo-50/40 border border-indigo-100/50 p-2.5 rounded-xl flex items-start gap-2 mt-2">
                                          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                          <p className="text-[11px] text-indigo-900 leading-normal">
                                            <strong className="font-semibold text-indigo-950">AI Triage Log:</strong> {report.justification}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    <div className="space-y-3">
                                      {report.imageUrl && (
                                        <div>
                                          <p className="font-semibold text-slate-800 mb-1">Attached Image Attachment:</p>
                                          <img
                                            src={report.imageUrl}
                                            alt={report.title}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-28 object-cover rounded-xl border border-slate-200 shadow-sm"
                                          />
                                        </div>
                                      )}
                                      <div className="bg-white p-3 border border-slate-200/60 rounded-xl space-y-1 text-[11px] text-slate-500 font-mono">
                                        <p>LATITUDE: {report.latitude.toFixed(6)}</p>
                                        <p>LONGITUDE: {report.longitude.toFixed(6)}</p>
                                        {report.linkedTicketId && (
                                          <p className="text-amber-600 font-semibold">LINKED TO DUPLICATE: {report.linkedTicketId}</p>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER MODERATION & BANS */}
        {activeSubTab === "users" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ban User Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-red-500" />
                  Ban Citizen Profile
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Add user accounts to the municipal blocklist. Banned users cannot submit reports, vote/verify issues, or post comments.
                </p>
              </div>

              <form onSubmit={handleBanUserSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Enter Citizen Username
                  </label>
                  <input
                    type="text"
                    value={userInputToBan}
                    onChange={(e) => setUserInputToBan(e.target.value)}
                    placeholder="e.g. Marcus Brody"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition"
                  />
                </div>

                {banError && <p className="text-xs text-red-600 font-semibold">{banError}</p>}
                {banSuccessMessage && <p className="text-xs text-emerald-600 font-semibold">{banSuccessMessage}</p>}

                <button
                  type="submit"
                  disabled={isBanning || !userInputToBan.trim()}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-display text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  {isBanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                  Ban Citizen Account
                </button>
              </form>

              {/* Suggestions Panel */}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Active Citizens on Platform
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCommunityUsers.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">No other active citizen accounts on platform.</span>
                  ) : (
                    activeCommunityUsers.map((user) => (
                      <button
                        key={user}
                        type="button"
                        onClick={() => setUserInputToBan(user)}
                        className="text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                      >
                        {user}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Banned Users List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Blocklist Registrations ({bannedUsers.length})
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  List of currently restricted accounts. Banned users are restricted from performing active civic duties on Beacon.
                </p>
              </div>

              <div className="border border-slate-100 rounded-xl divide-y divide-slate-150 overflow-hidden max-h-[280px] overflow-y-auto">
                {bannedUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 italic font-medium bg-slate-50/50">
                    No users are currently banned. Platform integrity remains pristine.
                  </div>
                ) : (
                  bannedUsers.map((bUser) => (
                    <div key={bUser} className="flex items-center justify-between p-3 hover:bg-slate-50/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-semibold text-slate-700">{bUser}</span>
                        <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-1.5 rounded uppercase font-bold tracking-wider">
                          Restricted
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnbanUser(bUser)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                      >
                        <UserCheck className="w-3 h-3" />
                        Unban
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESOLUTION ANALYTICS */}
        {activeSubTab === "analytics" && (
          <div className="space-y-6">
            {/* Primary Analytics Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Avg Resolution Velocity
                  </p>
                  <h3 className="text-2xl font-bold font-display text-slate-800 mt-1">
                    {analytics?.avgResolutionTimeHours || "0"} Hrs
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Time between reporting & municipal patch</p>
                </div>
                <div className="p-2.5 rounded-xl border text-indigo-600 bg-indigo-50 border-indigo-200">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    AI Auto-Triage Ratios
                  </p>
                  <h3 className="text-2xl font-bold font-display text-slate-800 mt-1">
                    {analytics ? Math.round(((analytics.validationStats.valid) / Math.max(analytics.totalReports, 1)) * 100) : "0"}%
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Proportion of verified genuine alerts</p>
                </div>
                <div className="p-2.5 rounded-xl border text-emerald-600 bg-emerald-50 border-emerald-200">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Spam & Duplicate Filter
                  </p>
                  <h3 className="text-2xl font-bold font-display text-red-600 mt-1">
                    {analytics ? (analytics.validationStats.duplicates + analytics.validationStats.spam) : "0"}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Avoided waste of municipal labor</p>
                </div>
                <div className="p-2.5 rounded-xl border text-red-600 bg-red-50 border-red-200">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Custom SVG Resolution Speed Chart by Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    Resolution Time by Category (Hours)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Detailed municipal speed in resolving different infrastructure classifications.
                  </p>
                </div>

                <div className="space-y-4">
                  {analytics && Object.keys(analytics.resolutionHoursByCategory).length > 0 ? (
                    Object.entries(analytics.resolutionHoursByCategory).map(([cat, hours], idx) => {
                      const values = Object.values(analytics.resolutionHoursByCategory) as number[];
                      const maxHours = Math.max(...values, 12);
                      const pct = Math.min(Math.round(((hours as number) / maxHours) * 100), 100);
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{cat}</span>
                            <span className="font-mono text-slate-500">{hours} hours</span>
                          </div>
                          <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.05 }}
                              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No resolved reports are available to compute resolution time metrics. Keep patching tickets!
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Status Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="font-display font-semibold text-slate-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    Validation & AI Filtering Diagnostics
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Distribution of incoming alerts through AI screening processes.
                  </p>
                </div>

                {analytics ? (
                  <div className="space-y-4 py-2">
                    {[
                      {
                        label: "Genuine / Approved Reports",
                        value: analytics.validationStats.valid,
                        color: "bg-emerald-500",
                        textColor: "text-emerald-700 bg-emerald-50"
                      },
                      {
                        label: "Duplicate Submissions",
                        value: analytics.validationStats.duplicates,
                        color: "bg-amber-500",
                        textColor: "text-amber-700 bg-amber-50"
                      },
                      {
                        label: "Obvious Spam / Discarded",
                        value: analytics.validationStats.spam,
                        color: "bg-red-500",
                        textColor: "text-red-700 bg-red-50"
                      }
                    ].map((item, idx) => {
                      const totalVal = Math.max(
                        analytics.validationStats.valid +
                        analytics.validationStats.duplicates +
                        analytics.validationStats.spam,
                        1
                      );
                      const pct = Math.round((item.value / totalVal) * 100);
                      return (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-700 font-medium">{item.label}</span>
                            <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${item.textColor}`}>
                              {item.value} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.05 }}
                              className={`h-full rounded-full ${item.color}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 italic">No diagnostics generated.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
