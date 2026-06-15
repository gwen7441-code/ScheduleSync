import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

type EmailStatus = "Sent" | "Simulated" | "Failed";

type EmailDeliveryResult = {
  status: EmailStatus;
  message: string;
};

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.join(process.cwd(), "server-db.json");
const DEFAULT_COURSE_ENTITY = "msevents_firstaidcourses";

app.use(express.json({ limit: "1mb" }));

function getDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read server-db.json", err);
  }
  return {
    dynamics365Config: {
      tenantId: "",
      clientId: "",
      clientSecret: "",
      environmentUrl: "",
      isConnected: false,
      activeEntityName: DEFAULT_COURSE_ENTITY,
      sendgridApiKey: ""
    },
    instructors: [],
    courses: [],
    schedules: [],
    notifications: [],
    adminEmailLogs: []
  };
}

function saveDatabase(db: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to server-db.json", err);
  }
}

function getRuntimeConfig(db: any) {
  const saved = db.dynamics365Config || {};
  const tenantId = process.env.DYNAMICS365_TENANT_ID || saved.tenantId || "";
  const clientId = process.env.DYNAMICS365_CLIENT_ID || saved.clientId || "";
  const clientSecret = process.env.DYNAMICS365_CLIENT_SECRET || "";
  const environmentUrl = process.env.DYNAMICS365_ENVIRONMENT_URL || saved.environmentUrl || "";
  const activeEntityName = process.env.DYNAMICS365_COURSE_ENTITY || saved.activeEntityName || DEFAULT_COURSE_ENTITY;
  const dataverseConfigured = Boolean(tenantId && clientId && clientSecret && environmentUrl);
  const sendgridConfigured = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL && process.env.ADMIN_ALERT_EMAIL);

  return {
    tenantId,
    clientId,
    clientSecret,
    environmentUrl,
    activeEntityName,
    dataverseConfigured,
    sendgridConfigured,
    integrationMode: dataverseConfigured ? "live-ready" : "demo"
  };
}

function getPublicConfig(db: any) {
  const runtime = getRuntimeConfig(db);
  return {
    tenantId: runtime.tenantId,
    clientId: runtime.clientId,
    clientSecret: runtime.clientSecret ? "Configured in server environment" : "",
    environmentUrl: runtime.environmentUrl,
    isConnected: runtime.dataverseConfigured,
    activeEntityName: runtime.activeEntityName,
    sendgridConfigured: runtime.sendgridConfigured,
    integrationMode: runtime.integrationMode
  };
}

function sanitizeInstructor(instructor: any) {
  const { password, otpCode, ...safeInstructor } = instructor;
  return safeInstructor;
}

function getPublicState(db: any) {
  return {
    dynamics365Config: getPublicConfig(db),
    instructors: (db.instructors || []).map(sanitizeInstructor),
    courses: db.courses || [],
    schedules: db.schedules || [],
    notifications: db.notifications || [],
    adminEmailLogs: db.adminEmailLogs || []
  };
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendAdminEmail(subject: string, html: string): Promise<EmailDeliveryResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SENDGRID_FROM_EMAIL;
  const to = process.env.ADMIN_ALERT_EMAIL;

  if (!apiKey || !from || !to) {
    return {
      status: "Simulated",
      message: "SendGrid is not fully configured. Set SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, and ADMIN_ALERT_EMAIL to send live email."
    };
  }

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to,
      from,
      subject,
      html
    });
    return { status: "Sent", message: `Email sent to ${to}.` };
  } catch (err: any) {
    console.error("SendGrid delivery failed:", err?.response?.body || err);
    return {
      status: "Failed",
      message: err?.message || "SendGrid delivery failed."
    };
  }
}

async function getDataverseAccessToken(runtime: ReturnType<typeof getRuntimeConfig>) {
  const tokenUrl = `https://login.microsoftonline.com/${runtime.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: runtime.clientId,
    client_secret: runtime.clientSecret,
    scope: `${runtime.environmentUrl.replace(/\/$/, "")}/.default`
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Microsoft Entra token request failed (${response.status}): ${details}`);
  }

  const token = await response.json();
  return token.access_token as string;
}

async function fetchDataverseJson(runtime: ReturnType<typeof getRuntimeConfig>, entitySetName: string, query = "") {
  const token = await getDataverseAccessToken(runtime);
  const baseUrl = runtime.environmentUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/data/v9.2/${entitySetName}${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0"
    }
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Dataverse ${entitySetName} request failed (${response.status}): ${details}`);
  }

  return response.json();
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "schedulesync",
        },
      },
    });
  }
  return aiClient;
}

app.get("/api/db", (req, res) => {
  res.json(getPublicState(getDatabase()));
});

app.post("/api/dynamics365/config", (req, res) => {
  const { tenantId, clientId, environmentUrl, activeEntityName, clientSecret, sendgridApiKey } = req.body;
  const db = getDatabase();

  if (clientSecret) {
    process.env.DYNAMICS365_CLIENT_SECRET = clientSecret;
  }
  if (sendgridApiKey) {
    process.env.SENDGRID_API_KEY = sendgridApiKey;
  }

  db.dynamics365Config = {
    tenantId: tenantId || "",
    clientId: clientId || "",
    clientSecret: "",
    environmentUrl: environmentUrl || "",
    isConnected: false,
    activeEntityName: activeEntityName || DEFAULT_COURSE_ENTITY,
    sendgridApiKey: ""
  };

  saveDatabase(db);

  const publicConfig = getPublicConfig(db);
  res.json({
    config: publicConfig,
    connection: {
      success: publicConfig.isConnected,
      message: publicConfig.isConnected
        ? "Configuration saved. Dataverse credentials are present on the server and ready for a live sync test."
        : "Configuration saved for demo mode. IT still needs to provide server-side Dataverse credentials before live sync.",
      sendgridConfigured: publicConfig.sendgridConfigured
    }
  });
});

app.post("/api/dynamics365/sync", async (req, res) => {
  const db = getDatabase();
  const runtime = getRuntimeConfig(db);

  if (!runtime.dataverseConfigured) {
    return res.status(400).json({
      success: false,
      mode: "demo",
      message: "Dataverse live sync is not configured yet. Add DYNAMICS365_TENANT_ID, DYNAMICS365_CLIENT_ID, DYNAMICS365_CLIENT_SECRET, and DYNAMICS365_ENVIRONMENT_URL on the server."
    });
  }

  try {
    const [contacts, courses] = await Promise.all([
      fetchDataverseJson(runtime, "contacts", "?$select=contactid,fullname,emailaddress1,mobilephone&$top=50"),
      fetchDataverseJson(runtime, runtime.activeEntityName, "?$top=50")
    ]);

    res.json({
      success: true,
      mode: "live",
      timestamp: new Date().toISOString(),
      syncedCoursesCount: Array.isArray(courses.value) ? courses.value.length : 0,
      syncedInstructorsCount: Array.isArray(contacts.value) ? contacts.value.length : 0,
      connectedToUrl: runtime.environmentUrl,
      message: "Dataverse connectivity verified. Field mapping is ready for IT schema binding."
    });
  } catch (err: any) {
    res.status(502).json({ success: false, mode: "live", message: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = getDatabase();

  const instructor = (db.instructors || []).find(
    (i: any) => i.email?.toLowerCase() === String(email || "").toLowerCase() && i.password === password
  );

  if (!instructor) {
    return res.status(401).json({ success: false, message: "Invalid email or password combination." });
  }

  res.json({ success: true, instructor: sanitizeInstructor(instructor) });
});

app.post("/api/auth/otp/send", (req, res) => {
  const { phone } = req.body;
  const db = getDatabase();

  const cleaned = normalizePhone(phone);
  const instructor = (db.instructors || []).find((i: any) => normalizePhone(i.phone) === cleaned);

  if (!instructor) {
    return res.status(404).json({
      success: false,
      message: `No active instructor contact found for phone: ${phone}.`
    });
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  instructor.otpCode = code;
  instructor.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.notifications.unshift({
    id: `sms-${Math.random().toString(36).substring(2, 9)}`,
    instructorId: instructor.id,
    title: "Demo SMS Code",
    message: `[Demo only] Your ScheduleSync login code is: ${code}`,
    type: "system",
    createdAt: new Date().toISOString(),
    read: false
  });
  saveDatabase(db);

  res.json({
    success: true,
    deliveryMode: "demo",
    demoCode: code,
    message: "Demo OTP generated. For production, connect this endpoint to IT-approved SMS or SSO MFA."
  });
});

app.post("/api/auth/otp/verify", (req, res) => {
  const { phone, code } = req.body;
  const db = getDatabase();

  const cleaned = normalizePhone(phone);
  const instructor = (db.instructors || []).find((i: any) => normalizePhone(i.phone) === cleaned);

  if (!instructor) {
    return res.status(404).json({ success: false, message: "Instructor phone not found." });
  }

  if (!instructor.otpCode || instructor.otpCode !== code) {
    return res.status(401).json({ success: false, message: "Incorrect security code." });
  }

  if (instructor.otpExpiresAt && new Date(instructor.otpExpiresAt).getTime() < Date.now()) {
    instructor.otpCode = "";
    instructor.otpExpiresAt = "";
    saveDatabase(db);
    return res.status(401).json({ success: false, message: "Security code expired. Please request a new one." });
  }

  instructor.otpCode = "";
  instructor.otpExpiresAt = "";
  saveDatabase(db);

  res.json({ success: true, instructor: sanitizeInstructor(instructor) });
});

function buildAvailabilityEmail(instructor: any, datesToAdd: string[], datesToRemove: string[], timestamp: string) {
  let changesListHtml = "";
  if (datesToAdd.length > 0) {
    changesListHtml += `<li><strong>Added availability dates:</strong> ${datesToAdd.map(escapeHtml).join(", ")}</li>`;
  }
  if (datesToRemove.length > 0) {
    changesListHtml += `<li><strong>Removed availability dates:</strong> ${datesToRemove.map(escapeHtml).join(", ")}</li>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; padding: 24px; line-height: 1.6; max-width: 640px; color: #334155;">
      <h2 style="color: #1e293b;">ScheduleSync Instructor Schedule Alert</h2>
      <p>Instructor <strong>${escapeHtml(instructor.name)}</strong> updated their availability.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="font-weight: 700;">Instructor</td><td>${escapeHtml(instructor.name)}</td></tr>
        <tr><td style="font-weight: 700;">Email</td><td>${escapeHtml(instructor.email)}</td></tr>
        <tr><td style="font-weight: 700;">Phone</td><td>${escapeHtml(instructor.phone)}</td></tr>
        <tr><td style="font-weight: 700;">Timestamp</td><td>${escapeHtml(new Date(timestamp).toLocaleString())}</td></tr>
      </table>
      <h3>Calendar Modifications</h3>
      <ul>${changesListHtml || "<li>No calendar slot adjustments submitted.</li>"}</ul>
      <p style="font-size: 12px; color: #64748b;">This message was generated by the scheduling portal. Dataverse sync status depends on server configuration.</p>
    </div>
  `;
}

app.post("/api/schedule/update", async (req, res) => {
  const { instructorId, datesToAdd = [], datesToRemove = [] } = req.body;
  const db = getDatabase();

  const instructor = (db.instructors || []).find((i: any) => i.id === instructorId);
  if (!instructor) {
    return res.status(404).json({ error: "Instructor not found" });
  }

  const addList = Array.isArray(datesToAdd) ? datesToAdd : [];
  const removeList = Array.isArray(datesToRemove) ? datesToRemove : [];
  const timestamp = new Date().toISOString();

  if (removeList.length > 0) {
    db.schedules = (db.schedules || []).filter((s: any) =>
      !(s.instructorId === instructorId && removeList.includes(s.date))
    );
  }

  addList.forEach((dateStr: string) => {
    const exists = (db.schedules || []).some((s: any) => s.instructorId === instructorId && s.date === dateStr);
    if (!exists) {
      db.schedules.push({
        id: `avail-${Math.random().toString(36).substring(2, 9)}`,
        instructorId,
        date: dateStr,
        status: "available",
        updatedAt: timestamp
      });
    }
  });

  const subject = `[Scheduling Alert] ${instructor.name} updated availability`;
  const bodyHtml = buildAvailabilityEmail(instructor, addList, removeList, timestamp);
  const delivery = await sendAdminEmail(subject, bodyHtml);

  const newEmailLog = {
    id: `email-${Math.random().toString(36).substring(2, 9)}`,
    timestamp,
    instructorName: instructor.name,
    actionType: (addList.length && removeList.length) ? "batch_update" : (addList.length ? "addition" : "removal"),
    subject,
    bodyHtml,
    toEmail: process.env.ADMIN_ALERT_EMAIL || "Not configured",
    status: delivery.status,
    deliveryMessage: delivery.message
  };

  db.adminEmailLogs.unshift(newEmailLog);
  saveDatabase(db);

  res.json({
    success: true,
    schedules: db.schedules,
    emailLogged: newEmailLog
  });
});

app.post("/api/courses/assign", (req, res) => {
  const { courseId, instructorId } = req.body;
  const db = getDatabase();

  const course = (db.courses || []).find((c: any) => c.id === courseId);
  const instructor = (db.instructors || []).find((i: any) => i.id === instructorId);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  course.instructorId = instructorId || "";
  course.status = instructorId ? "PendingAssignment" : "Draft";

  if (instructorId && instructor) {
    db.notifications.unshift({
      id: `notif-${Math.random().toString(36).substring(2, 9)}`,
      instructorId,
      title: "New Course Offer Received",
      message: `You have a pending course offer: '${course.title}' on ${course.date}. Please accept or decline the assignment.`,
      type: "assignment",
      createdAt: new Date().toISOString(),
      read: false,
      courseId
    });
  }

  saveDatabase(db);
  res.json({ success: true, course, notifications: db.notifications });
});

app.post("/api/courses/respond-assignment", async (req, res) => {
  const { courseId, instructorId, action } = req.body;
  const db = getDatabase();

  const course = (db.courses || []).find((c: any) => c.id === courseId);
  const instructor = (db.instructors || []).find((i: any) => i.id === instructorId);

  if (!course || !instructor) {
    return res.status(404).json({ error: "Course or instructor mismatch." });
  }

  const timestamp = new Date().toISOString();
  let emailLog: any = null;

  if (action === "accept") {
    course.status = "Confirmed";
    db.notifications.unshift({
      id: `notif-${Math.random().toString(36).substring(2, 9)}`,
      instructorId,
      title: "Course Confirmed",
      message: `You accepted ${course.title} on ${course.date}.`,
      type: "system",
      createdAt: timestamp,
      read: false,
      courseId
    });
  } else {
    course.instructorId = "";
    course.status = "Draft";

    db.notifications.unshift({
      id: `notif-${Math.random().toString(36).substring(2, 9)}`,
      instructorId,
      title: "Opportunity Declined",
      message: `You declined ${course.title} on ${course.date}. Coordination has been notified if email is configured.`,
      type: "system",
      createdAt: timestamp,
      read: false,
      courseId
    });

    const subject = `[Declined Assignment] ${instructor.name} declined: ${course.title}`;
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; line-height: 1.6; max-width: 640px; color: #1e293b;">
        <h2>Course Assignment Declined</h2>
        <p><strong>${escapeHtml(instructor.name)}</strong> declined a proposed assignment.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="font-weight: 700;">Course</td><td>${escapeHtml(course.title)} (${escapeHtml(course.code)})</td></tr>
          <tr><td style="font-weight: 700;">Date and Time</td><td>${escapeHtml(course.date)} at ${escapeHtml(course.time)}</td></tr>
          <tr><td style="font-weight: 700;">Location</td><td>${escapeHtml(course.location)}</td></tr>
          <tr><td style="font-weight: 700;">Declined By</td><td>${escapeHtml(instructor.name)} (${escapeHtml(instructor.email)})</td></tr>
          <tr><td style="font-weight: 700;">Timestamp</td><td>${escapeHtml(new Date(timestamp).toLocaleString())}</td></tr>
        </table>
        <p>The course has been returned to Draft / Unassigned status in the scheduling portal.</p>
      </div>
    `;
    const delivery = await sendAdminEmail(subject, bodyHtml);

    emailLog = {
      id: `email-${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      instructorName: instructor.name,
      actionType: "removal",
      subject,
      bodyHtml,
      toEmail: process.env.ADMIN_ALERT_EMAIL || "Not configured",
      status: delivery.status,
      deliveryMessage: delivery.message
    };
    db.adminEmailLogs.unshift(emailLog);
  }

  saveDatabase(db);
  res.json({
    success: true,
    course,
    notifications: db.notifications,
    emailLogged: emailLog
  });
});

app.post("/api/courses/roster", (req, res) => {
  const { courseId, trainees } = req.body;
  const db = getDatabase();
  const course = (db.courses || []).find((c: any) => c.id === courseId);

  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  if (!Array.isArray(trainees)) {
    return res.status(400).json({ error: "trainees must be an array." });
  }

  course.trainees = trainees.map((t: any) => ({
    name: String(t.name || ""),
    email: String(t.email || ""),
    phone: String(t.phone || ""),
    company: t.company ? String(t.company) : "",
    status: ["Registered", "Passed", "NoShow"].includes(t.status) ? t.status : "Registered"
  }));
  course.currentlyRegistered = course.trainees.length;
  saveDatabase(db);

  res.json({ success: true, course });
});

app.post("/api/notifications/read", (req, res) => {
  const { id, instructorId } = req.body;
  const db = getDatabase();

  if (id === "all") {
    db.notifications.forEach((n: any) => {
      if (n.instructorId === instructorId) n.read = true;
    });
  } else {
    const notif = db.notifications.find((n: any) => n.id === id && n.instructorId === instructorId);
    if (notif) notif.read = true;
  }

  saveDatabase(db);
  res.json({ success: true, notifications: db.notifications });
});

app.post("/api/admin-email-logs/clear", (req, res) => {
  const db = getDatabase();
  db.adminEmailLogs = [];
  saveDatabase(db);
  res.json({ success: true, adminEmailLogs: [] });
});

app.post("/api/ai/conflict-advisor", async (req, res) => {
  const { instructorId, proposedDates } = req.body;
  const db = getDatabase();

  const instructor = (db.instructors || []).find((i: any) => i.id === instructorId);
  if (!instructor) {
    return res.status(404).json({ error: "Instructor not found" });
  }

  const assignedCourses = (db.courses || []).filter((c: any) => c.instructorId === instructorId);
  const schedules = (db.schedules || []).filter((s: any) => s.instructorId === instructorId);

  const prompt = `
    You are a scheduling assistant for a first aid training provider.
    Instructor: ${instructor.name}
    Qualified for: ${instructor.certificationLevel}
    Current assignments: ${JSON.stringify(assignedCourses.map((c: any) => ({ date: c.date, title: c.title, time: c.time, location: c.location })))}
    Current available dates: ${schedules.map((s: any) => s.date).join(", ") || "None listed"}
    Proposed changes: ${JSON.stringify(proposedDates)}

    Give a compact, mobile-friendly conflict advisory. Be clear about confirmed courses that should not be removed without coordinator approval.
  `;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ success: true, report: response.text });
  } catch (err: any) {
    const hasConflict = proposedDates?.datesToRemove?.some((d: string) =>
      assignedCourses.some((c: any) => c.date === d && c.status === "Confirmed")
    );
    res.json({
      success: false,
      report: `### Scheduling Advisory
${hasConflict
  ? "Warning: one or more removed dates has a confirmed course assignment. Coordinate before saving this change."
  : "No confirmed-course conflict was detected in the proposed change."}

- Added dates: ${proposedDates?.datesToAdd?.join(", ") || "None"}
- Removed dates: ${proposedDates?.datesToRemove?.join(", ") || "None"}
- AI service is offline or not configured, so this is the built-in rule check.`
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ScheduleSync] listening at http://localhost:${PORT}`);
  });
}

startServer();
