import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// DB File Path
const DB_FILE = path.join(process.cwd(), "reports_db.json");

// Distance calculation using Haversine formula (meters)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Initial seed reports to populate the platform immediately with realistic records
const SEED_REPORTS = [
  {
    id: "rep-1",
    title: "Dangerous Pothole on Active School Crossing",
    description: "Deep pothole right in the middle of the pedestrian crossing. Cars are swerving onto the curb to avoid it. High safety hazard during school pickup hours.",
    category: "Pothole",
    severity: 5,
    justification: "Critical safety hazard located on an active pedestrian school crosswalk forcing vehicles to deviate dangerously.",
    status: "In Progress",
    latitude: 37.7755,
    longitude: -122.4182,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
    upvotes: 8,
    verifiedBy: ["ip-1", "ip-2", "ip-3"],
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=800&q=80",
    isValid: true,
    isDuplicate: false,
    linkedTicketId: null,
    comments: [
      { id: "c1", author: "Sarah Jenkins", text: "Almost twisted my ankle here yesterday! Thanks for reporting.", createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
      { id: "c2", author: "Officer Martinez", text: "Municipal road crew has put up safety cones. Full patch scheduled for tomorrow.", createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString() }
    ],
    timeline: [
      { status: "Reported", timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), note: "Reported by resident." },
      { status: "Verified", timestamp: new Date(Date.now() - 2.8 * 24 * 3600 * 1000).toISOString(), note: "Community verified with 3+ upvotes." },
      { status: "In Progress", timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), note: "Road patch crew dispatched. Temporary cones placed." }
    ]
  },
  {
    id: "rep-2",
    title: "Major Water Main Leak Flooding Sidewalk",
    description: "Fresh water bubbling out from underneath the sidewalk flagstones. Flooding the bus stop area and wasting clean water.",
    category: "Water Leakage",
    severity: 4,
    justification: "Significant active water main leakage causing localized flooding at a busy public transit boarding zone.",
    status: "Verified",
    latitude: 37.7732,
    longitude: -122.4211,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), // 1 day ago
    upvotes: 4,
    verifiedBy: ["ip-4", "ip-5"],
    imageUrl: "https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=800&q=80",
    isValid: true,
    isDuplicate: false,
    linkedTicketId: null,
    comments: [
      { id: "c3", author: "James Chen", text: "Wasting so much water. Hope the utility company responds soon.", createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
    ],
    timeline: [
      { status: "Reported", timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(), note: "Reported via mobile application." },
      { status: "Verified", timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), note: "Verified by 4 neighbors." }
    ]
  },
  {
    id: "rep-3",
    title: "Damaged Streetlight creating dark blindspot",
    description: "Streetlight fixture is completely broken/shattered. The entire corner is in absolute pitch darkness at night, creating a security issue.",
    category: "Damaged Streetlight",
    severity: 3,
    justification: "Creates dark alleyway blindspot, impacting public pedestrian safety and increasing burglary risk.",
    status: "Reported",
    latitude: 37.7761,
    longitude: -122.4234,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6 hours ago
    upvotes: 1,
    verifiedBy: [],
    imageUrl: "https://images.unsplash.com/photo-1509024644558-2f56ce76c490?auto=format&fit=crop&w=800&q=80",
    isValid: true,
    isDuplicate: false,
    linkedTicketId: null,
    comments: [],
    timeline: [
      { status: "Reported", timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), note: "Citizen flagged corner of Franklin & Elm." }
    ]
  },
  {
    id: "rep-4",
    title: "Overflowing Garbage Bin & Litter in Park",
    description: "The main bin near the playground is overflowing. Crows are tearing open bags and spreading plastic wrappers all over the kids' play turf.",
    category: "Waste Management",
    severity: 2,
    justification: "Overflowing refuse bin resulting in sanitary issues and animal dispersion of litter adjacent to a playground.",
    status: "Resolved",
    latitude: 37.7741,
    longitude: -122.4170,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), // 5 days ago
    upvotes: 12,
    verifiedBy: ["ip-1", "ip-2", "ip-4", "ip-6"],
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
    isValid: true,
    isDuplicate: false,
    linkedTicketId: null,
    comments: [
      { id: "c4", author: "Mom of Two", text: "This is disgusting. Kids play right here.", createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString() },
      { id: "c5", author: "Park Maintenance", text: "Sanitation crew cleared and added double-capacity bins.", createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() }
    ],
    timeline: [
      { status: "Reported", timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), note: "Reported with photos." },
      { status: "Verified", timestamp: new Date(Date.now() - 4.5 * 24 * 3600 * 1000).toISOString(), note: "Rapid verification by neighborhood group." },
      { status: "In Progress", timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), note: "Crew dispatched to park." },
      { status: "Resolved", timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), note: "Cleaned, sanitized, and reinforced with heavy-duty bins." }
    ]
  }
];

let bannedUsers: string[] = [];

// Helper to load reports & banned users
function loadReports(): any[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = { reports: SEED_REPORTS, bannedUsers: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
      bannedUsers = [];
      return SEED_REPORTS;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      bannedUsers = [];
      return parsed;
    } else {
      bannedUsers = parsed.bannedUsers || [];
      return parsed.reports || [];
    }
  } catch (error) {
    console.error("Error reading database file, resetting to seeds", error);
    bannedUsers = [];
    return SEED_REPORTS;
  }
}

// Helper to save reports & banned users
function saveReports(newReports: any[]) {
  try {
    const dbData = { reports: newReports, bannedUsers: bannedUsers };
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2));
  } catch (error) {
    console.error("Error writing database file", error);
  }
}

// Initialize reports
let reports = loadReports();

// Lazy Gemini API initialization
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is missing. App will use local rule-based intelligence for demo mode.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// --- API ROUTES ---

// 1. GET ALL REPORTS (Optional filtering by radius)
app.get("/api/reports", (req, res) => {
  const { lat, lng, radius } = req.query;
  
  if (lat && lng && radius) {
    const centerLat = parseFloat(lat as string);
    const centerLng = parseFloat(lng as string);
    const radMeters = parseFloat(radius as string);

    const filtered = reports.filter((r) => {
      const dist = getDistanceMeters(centerLat, centerLng, r.latitude, r.longitude);
      return dist <= radMeters;
    });
    return res.json(filtered);
  }
  
  res.json(reports);
});

// 2. POST A NEW REPORT (Accepts multipart details or raw JSON)
app.post("/api/reports", async (req, res) => {
  try {
    const { title, description, latitude, longitude, imageBase64, imageType, creator } = req.body;

    if (!title || !description || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields (title, description, latitude, longitude)" });
    }

    const reportCreator = creator || "Anonymous Civic Hero";
    if (bannedUsers.includes(reportCreator)) {
      return res.status(403).json({ error: "Your citizen account has been banned due to repeated policy violations.", isBanned: true });
    }

    const reportLat = parseFloat(latitude);
    const reportLng = parseFloat(longitude);

    // Initial default values in case Gemini fails or is not available
    let category = "Other";
    let severity = 3;
    let justification = "Default system assessment. Subject to manual validation.";
    let isValid = true;
    let isDuplicate = false;
    let linkedTicketId: string | null = null;
    let aiReason = "Rule-based backup analysis.";

    const ai = getGemini();

    // Find nearby tickets within 500m to pass to duplicate detection
    const nearbyTickets = reports
      .filter((r) => getDistanceMeters(reportLat, reportLng, r.latitude, r.longitude) <= 500)
      .map((r) => ({ id: r.id, title: r.title, description: r.description, category: r.category, status: r.status }));

    if (ai) {
      console.log("Running Gemini Triage & Validation Engines...");
      try {
        // Prepare contents for Agent 1 (Triage)
        const parts: any[] = [];
        if (imageBase64) {
          parts.push({
            inlineData: {
              mimeType: imageType || "image/png",
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
            },
          });
        }
        parts.push({
          text: `Evaluate this citizen report:\nTitle: ${title}\nDescription: ${description}`,
        });

        // 1. Run Agent 1 (Triage Engine)
        const triageResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: parts,
          config: {
            systemInstruction: `You are an AI infrastructure analyst for a municipal administration. Analyze the provided image and text report of a community issue.
1. Categorize the issue into a strict schema: [Pothole, Water Leakage, Damaged Streetlight, Waste Management, Public Transport/Transit Gap, Other].
2. Assess the severity on a scale of 1-5 based on safety risk, road hazard, utility loss, and infrastructure damage. (1 is minor inconvenience, 5 is emergency danger).
3. Output a clean JSON object matching the requested schema.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description: "Must be exactly one of: Pothole, Water Leakage, Damaged Streetlight, Waste Management, Public Transport/Transit Gap, Other",
                },
                severity: {
                  type: Type.INTEGER,
                  description: "Severity rating 1 to 5.",
                },
                justification: {
                  type: Type.STRING,
                  description: "A single concise sentence explaining the category and severity.",
                },
              },
              required: ["category", "severity", "justification"],
            },
          },
        });

        if (triageResponse.text) {
          const triageResult = JSON.parse(triageResponse.text);
          category = triageResult.category || "Other";
          severity = Number(triageResult.severity) || 3;
          justification = triageResult.justification || justification;
        }

        // 2. Run Agent 2 (Validation & Duplicate Detection)
        const validationPrompt = `Evaluate the incoming report against these nearby reports within a 500m radius:
Incoming:
Title: ${title}
Description: ${description}
Assigned Category: ${category}

Nearby reports:
${JSON.stringify(nearbyTickets, null, 2)}

Determine if the incoming report is a genuine new community report, or a duplicate of an existing one, or if it is obvious spam/fake report.`;

        const validationResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: validationPrompt,
          config: {
            systemInstruction: `You are a data validation agent for a city management system. Compare the incoming issue report against the provided list of recent reports within a 500-meter radius.
Determine:
1. is_valid: false if the report is spam, gibberish, offensive, or physically impossible. Otherwise true.
2. is_duplicate: true if there is an existing ticket in the list that describes the exact same issue (e.g., same pothole, same broken streetlight).
3. linked_ticket_id: string ID of the duplicated ticket if is_duplicate is true, otherwise null.
4. reason: A 1-sentence explanation of your assessment.`,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                is_valid: { type: Type.BOOLEAN },
                is_duplicate: { type: Type.BOOLEAN },
                linked_ticket_id: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["is_valid", "is_duplicate", "reason"],
            },
          },
        });

        if (validationResponse.text) {
          const validationResult = JSON.parse(validationResponse.text);
          isValid = validationResult.is_valid !== false;
          isDuplicate = !!validationResult.is_duplicate;
          linkedTicketId = validationResult.linked_ticket_id || null;
          aiReason = validationResult.reason || aiReason;
        }

      } catch (geminiError) {
        console.error("Gemini processing error, falling back to local heuristic analysis:", geminiError);
        // Heuristic analysis if Gemini has API issues
        const titleLower = title.toLowerCase();
        const descLower = description.toLowerCase();
        
        if (titleLower.includes("pothole") || descLower.includes("pothole")) category = "Pothole";
        else if (titleLower.includes("water") || titleLower.includes("leak") || descLower.includes("pipe")) category = "Water Leakage";
        else if (titleLower.includes("light") || titleLower.includes("lamp") || descLower.includes("dark")) category = "Damaged Streetlight";
        else if (titleLower.includes("trash") || titleLower.includes("garbage") || descLower.includes("waste")) category = "Waste Management";
        else if (titleLower.includes("bus") || titleLower.includes("transit") || descLower.includes("route")) category = "Public Transport/Transit Gap";

        // Duplicate check local logic
        const localDuplicate = nearbyTickets.find(t => t.category === category);
        if (localDuplicate) {
          isDuplicate = true;
          linkedTicketId = localDuplicate.id;
        }
      }
    } else {
      // Local fallback categorization & duplicate logic if no API key is set
      const titleLower = title.toLowerCase();
      const descLower = description.toLowerCase();
      if (titleLower.includes("pothole") || descLower.includes("pothole")) {
        category = "Pothole";
        severity = 4;
        justification = "Identified as road hazard pothole using title keyword match.";
      } else if (titleLower.includes("leak") || titleLower.includes("pipe") || titleLower.includes("water")) {
        category = "Water Leakage";
        severity = 3;
        justification = "Water utility disruption flagged via description analysis.";
      } else if (titleLower.includes("light") || titleLower.includes("dark")) {
        category = "Damaged Streetlight";
        severity = 2;
        justification = "Lighting outage detected near coordinates.";
      } else if (titleLower.includes("trash") || titleLower.includes("garbage") || titleLower.includes("waste")) {
        category = "Waste Management";
        severity = 2;
        justification = "Sanitation overflow hazard identified.";
      } else if (titleLower.includes("bus") || titleLower.includes("stop") || titleLower.includes("transit")) {
        category = "Public Transport/Transit Gap";
        severity = 3;
        justification = "Transit frequency or layout issue flagged.";
      }

      const localDuplicate = nearbyTickets.find(t => t.category === category);
      if (localDuplicate) {
        isDuplicate = true;
        linkedTicketId = localDuplicate.id;
        aiReason = `Automated duplicate detection matches nearby issue: ${localDuplicate.title}`;
      }
    }

    // Assign a local or placeholder image URL if none provided
    const resolvedImageUrl = imageBase64 
      ? imageBase64 
      : `https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=800&q=80`; // Placeholder generic civic

    const newId = `rep-${Date.now()}`;
    const newReport = {
      id: newId,
      creator: reportCreator,
      title,
      description,
      category,
      severity,
      justification,
      status: "Reported",
      latitude: reportLat,
      longitude: reportLng,
      createdAt: new Date().toISOString(),
      upvotes: 0,
      verifiedBy: [],
      imageUrl: resolvedImageUrl,
      isValid,
      isDuplicate,
      linkedTicketId,
      comments: [],
      timeline: [
        { status: "Reported", timestamp: new Date().toISOString(), note: `Report submitted. Triaged as ${category} (Severity ${severity}/5).` }
      ]
    };

    reports.unshift(newReport);
    saveReports(reports);

    res.status(201).json({
      success: true,
      report: newReport,
      aiAnalysis: {
        category,
        severity,
        justification,
        isValid,
        isDuplicate,
        linkedTicketId,
        aiReason
      }
    });

  } catch (error: any) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Failed to create report", details: error.message });
  }
});

// 3. POST VERIFY/UPVOTE TICKET
app.post("/api/reports/:id/verify", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // Unique client session or IP ID

  const rIdx = reports.findIndex((r) => r.id === id);
  if (rIdx === -1) {
    return res.status(404).json({ error: "Report not found" });
  }

  const report = reports[rIdx];
  const user = userId || "anonymous-user";

  if (bannedUsers.includes(user)) {
    return res.status(403).json({ error: "Your citizen account has been banned due to repeated policy violations.", isBanned: true });
  }

  if (report.verifiedBy.includes(user)) {
    return res.status(400).json({ error: "You have already verified this report." });
  }

  report.upvotes += 1;
  report.verifiedBy.push(user);

  // Transition state to 'Verified' if upvotes cross threshold (e.g., 3 upvotes)
  if (report.status === "Reported" && report.upvotes >= 3) {
    report.status = "Verified";
    report.timeline.push({
      status: "Verified",
      timestamp: new Date().toISOString(),
      note: `Promoted to Verified by community consensus (3+ verifications).`
    });
  }

  saveReports(reports);
  res.json({ success: true, upvotes: report.upvotes, status: report.status, timeline: report.timeline });
});

// 4. POST COMMENT ON TICKET
app.post("/api/reports/:id/comment", (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ error: "Author and text required" });
  }

  if (bannedUsers.includes(author)) {
    return res.status(403).json({ error: "Your citizen account has been banned due to repeated policy violations.", isBanned: true });
  }

  const rIdx = reports.findIndex((r) => r.id === id);
  if (rIdx === -1) {
    return res.status(404).json({ error: "Report not found" });
  }

  const report = reports[rIdx];
  const newComment = {
    id: `comm-${Date.now()}`,
    author,
    text,
    createdAt: new Date().toISOString()
  };

  report.comments.push(newComment);
  saveReports(reports);

  res.json({ success: true, comment: newComment });
});

// 5. POST TICKET STATUS UPDATE (For authorities or trusted volunteers to patch/resolve)
app.post("/api/reports/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status || !["In Progress", "Resolved"].includes(status)) {
    return res.status(400).json({ error: "Valid status ('In Progress' or 'Resolved') is required." });
  }

  const rIdx = reports.findIndex((r) => r.id === id);
  if (rIdx === -1) {
    return res.status(404).json({ error: "Report not found" });
  }

  const report = reports[rIdx];
  report.status = status;
  report.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Municipal update: Action marked as ${status}.`
  });

  saveReports(reports);
  res.json({ success: true, status: report.status, timeline: report.timeline });
});

// 6. GET DASHBOARD INSIGHTS
app.get("/api/dashboard/insights", (req, res) => {
  const total = reports.length;
  const byCategory = reports.reduce((acc: any, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  const byStatus = reports.reduce((acc: any, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  // Compute average severity
  const avgSeverity = total > 0 
    ? (reports.reduce((sum, r) => sum + r.severity, 0) / total).toFixed(1)
    : 0;

  // Resolved count
  const resolvedCount = reports.filter(r => r.status === "Resolved").length;

  res.json({
    total,
    byCategory,
    byStatus,
    avgSeverity,
    resolvedCount,
    hotspots: reports.filter(r => r.severity >= 4).map(r => ({ lat: r.latitude, lng: r.longitude, severity: r.severity, title: r.title }))
  });
});

// 7. GET LEADERBOARD
app.get("/api/leaderboard", (req, res) => {
  // Generate a realistic, animated leaderboard showing community members and their scores
  const baseLeaderboard = [
    { name: "Officer Martinez", points: 850, reportsCount: 12, verificationsCount: 25, badge: "Civic Champion" },
    { name: "Sarah Jenkins", points: 640, reportsCount: 8, verificationsCount: 18, badge: "Local Guardian" },
    { name: "James Chen", points: 410, reportsCount: 5, verificationsCount: 11, badge: "First Responder" },
    { name: "Elena Rostova", points: 320, reportsCount: 3, verificationsCount: 14, badge: "Civic Inspector" },
    { name: "Marcus Brody", points: 190, reportsCount: 2, verificationsCount: 7, badge: "Active Citizen" }
  ];
  res.json(baseLeaderboard);
});

// --- ADMIN DASHBOARD API ROUTES ---

// 1. Get Banned Users list
app.get("/api/admin/banned-users", (req, res) => {
  res.json({ bannedUsers });
});

// 2. Ban a user
app.post("/api/admin/ban", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required to ban" });
  }
  const cleanUsername = username.trim();
  if (!bannedUsers.includes(cleanUsername)) {
    bannedUsers.push(cleanUsername);
    saveReports(reports); // saves the updated bannedUsers as well
  }
  res.json({ success: true, bannedUsers });
});

// 3. Unban a user
app.post("/api/admin/unban", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required to unban" });
  }
  const cleanUsername = username.trim();
  bannedUsers = bannedUsers.filter((u) => u !== cleanUsername);
  saveReports(reports); // saves the updated bannedUsers as well
  res.json({ success: true, bannedUsers });
});

// 4. Manually categorize or re-categorize an issue
app.post("/api/admin/reports/:id/category", (req, res) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!category) {
    return res.status(400).json({ error: "Category is required." });
  }

  const rIdx = reports.findIndex((r) => r.id === id);
  if (rIdx === -1) {
    return res.status(404).json({ error: "Report not found." });
  }

  const report = reports[rIdx];
  const oldCategory = report.category;
  report.category = category;
  
  // Append audit trail to timeline
  report.timeline.push({
    status: report.status,
    timestamp: new Date().toISOString(),
    note: `System Admin manually re-categorized from "${oldCategory}" to "${category}".`
  });

  saveReports(reports);
  res.json({ success: true, report });
});

// 5. Update issue status with administrative authorization (allows transitioning to any status)
app.post("/api/admin/reports/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ["Reported", "Verified", "In Progress", "Resolved"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Valid status (${validStatuses.join(", ")}) is required.` });
  }

  const rIdx = reports.findIndex((r) => r.id === id);
  if (rIdx === -1) {
    return res.status(404).json({ error: "Report not found." });
  }

  const report = reports[rIdx];
  const oldStatus = report.status;
  report.status = status;
  
  report.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Admin state modification: Status manually changed from "${oldStatus}" to "${status}".`
  });

  saveReports(reports);
  res.json({ success: true, report });
});

// 6. Get advanced admin analytics (resolution times, validation ratios, category metrics)
app.get("/api/admin/analytics", (req, res) => {
  const total = reports.length;
  
  // Calculate average resolution time overall and per category
  let totalResolutionTimeMs = 0;
  let resolvedCount = 0;
  const resolutionTimeByCategory: Record<string, { totalTimeMs: number; count: number }> = {};

  reports.forEach((report) => {
    if (report.status === "Resolved") {
      // Find the resolved timeline event
      const resolvedEvent = report.timeline.find((evt: any) => evt.status === "Resolved");
      const start = new Date(report.createdAt).getTime();
      const end = resolvedEvent ? new Date(resolvedEvent.timestamp).getTime() : new Date().getTime();
      
      const durationMs = end - start;
      if (durationMs > 0) {
        totalResolutionTimeMs += durationMs;
        resolvedCount++;

        const cat = report.category || "Other";
        if (!resolutionTimeByCategory[cat]) {
          resolutionTimeByCategory[cat] = { totalTimeMs: 0, count: 0 };
        }
        resolutionTimeByCategory[cat].totalTimeMs += durationMs;
        resolutionTimeByCategory[cat].count++;
      }
    }
  });

  const avgResolutionTimeHours = resolvedCount > 0 
    ? parseFloat((totalResolutionTimeMs / (1000 * 60 * 60 * resolvedCount)).toFixed(1))
    : 0;

  const resolutionHoursByCategory: Record<string, number> = {};
  Object.entries(resolutionTimeByCategory).forEach(([cat, data]) => {
    resolutionHoursByCategory[cat] = parseFloat((data.totalTimeMs / (1000 * 60 * 60 * data.count)).toFixed(1));
  });

  // Calculate stats on validation mechanisms
  const duplicateCount = reports.filter((r) => r.isDuplicate).length;
  const spamCount = reports.filter((r) => !r.isValid).length;
  const validReportCount = reports.filter((r) => r.isValid && !r.isDuplicate).length;

  // Distribution of reports by category
  const reportsByCategory = reports.reduce((acc: Record<string, number>, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});

  // Severity metrics
  const severityCounts = reports.reduce((acc: Record<number, number>, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  res.json({
    totalReports: total,
    resolvedCount,
    avgResolutionTimeHours,
    resolutionHoursByCategory,
    validationStats: {
      duplicates: duplicateCount,
      spam: spamCount,
      valid: validReportCount
    },
    reportsByCategory,
    severityCounts
  });
});


// --- VITE DEV SERVER AND PRODUCTION SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware configured.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from: " + distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hyperlocal Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
