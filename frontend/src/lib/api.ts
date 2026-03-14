/**
 * Centralized API client for the Breach platform.
 * All backend requests go through /api proxy (configured in vite.config.ts).
 */

const API_BASE = "/api";

// ── Token management ────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("breach_token");
}

export function setToken(token: string): void {
  localStorage.setItem("breach_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("breach_token");
}

// ── Core fetch wrapper ──────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  department?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  created_at: string;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload): Promise<UserOut> {
  return apiFetch<UserOut>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMe(): Promise<UserOut> {
  return apiFetch<UserOut>("/auth/me");
}

// ── Admin Dashboard ──────────────────────────────────────────────────────────

export interface DashboardOverview {
  total_campaigns: number;
  active_campaigns: number;
  employees_tested: number;
  avg_risk_score: number;
  high_risk_users: number;
}

export async function fetchAdminDashboard(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>("/admin/dashboard");
}

// ── Events ───────────────────────────────────────────────────────────────────

export interface EventOut {
  id: number;
  user_id: number | null;
  campaign_id: number | null;
  event_type: string;
  ip_address: string | null;
  timestamp: string;
  metadata_?: Record<string, any> | null;
  user_email: string | null;
  campaign_name: string | null;
}

export async function fetchRecentEvents(limit = 50): Promise<EventOut[]> {
  return apiFetch<EventOut[]>(`/admin/recent-events?limit=${limit}`);
}

// ── Campaigns ────────────────────────────────────────────────────────────────

export interface CampaignOut {
  id: number;
  name: string;
  description: string | null;
  channel_type: string;
  attack_type: string;
  target_group: string | null;
  template_name: string | null;
  scheduled_time: string | null;
  status: string;
  created_by: number;
  created_at: string;
}

export interface CampaignCreate {
  campaign_name: string;
  description?: string;
  channel_type?: "EMAIL" | "SMS" | "WHATSAPP";
  attack_type: string;
  target_group?: string;
  template_id?: number;
  template_name?: string;
  subject?: string;
  body?: string;
  schedule_date?: string;
  ai_model?: string;
  ai_theme?: string;
  ai_difficulty?: string;
  ai_tone?: string;
}

export interface AIEmailGenerateRequest {
  attack_type: string;
  theme: string;
  difficulty: string;
  department: string;
  tone: string;
  model: string;
}

export interface AIEmailGenerateResponse {
  subject: string;
  body: string;
  cta_text: string;
}

export interface DrillOption {
  label: string;
  score: number;
  feedback: string;
}

export interface DrillScenario {
  title: string;
  description: string;
  difficulty: string;
  options: DrillOption[];
}

export async function fetchCampaigns(): Promise<CampaignOut[]> {
  return apiFetch<CampaignOut[]>("/campaigns/");
}

export async function createCampaign(payload: CampaignCreate): Promise<CampaignOut> {
  return apiFetch<CampaignOut>("/campaigns/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function clearAllCampaigns(): Promise<void> {
  return apiFetch<void>("/campaigns/delete/all", {
    method: "DELETE",
  });
}

export async function generateAIEmail(payload: AIEmailGenerateRequest): Promise<AIEmailGenerateResponse> {
  return apiFetch<AIEmailGenerateResponse>("/ai/generate-phishing-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchDepartments(): Promise<string[]> {
  return apiFetch<string[]>("/admin/departments");
}

export async function fetchRandomDrill(): Promise<DrillScenario> {
  return apiFetch<DrillScenario>("/drills/random");
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface UserRiskListEntry {
  name: string;
  email: string;
  department: string;
  risk_level: string;
  risk_score: number;
  clicks: number;
  credentials: number;
  downloads: number;
  reported: number;
  training_progress: number;
}

export interface UserRiskListResponse {
  users: UserRiskListEntry[];
  distribution: Record<string, number>;
}

export interface AnalyticsOverview {
  click_rate: number;
  credential_rate: number;
  download_rate: number;
  report_rate: number;
  high_risk_departments: { name: string; score: number }[];
}

export interface DeptRiskRate {
  department: string;
  click_rate: number;
  credential_rate: number;
  download_rate: number;
  report_rate: number;
}

export interface TrendPoint {
  campaign: string;
  total_events: number;
  clicks: number;
  credentials: number;
  downloads: number;
}

export async function fetchAnalyticsDashboard(): Promise<AnalyticsOverview> {
  return apiFetch<AnalyticsOverview>("/analytics/dashboard");
}

export async function fetchUserRiskList(): Promise<UserRiskListResponse> {
  return apiFetch<UserRiskListResponse>("/analytics/users");
}

export async function fetchDepartmentRisk(): Promise<DeptRiskRate[]> {
  return apiFetch<DeptRiskRate[]>("/analytics/department-risk");
}

export async function fetchCampaignTrend(): Promise<TrendPoint[]> {
  return apiFetch<TrendPoint[]>("/analytics/campaign-trend");
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface UserWithRisk {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string | null;
  risk_score: number | null;
  risk_level: string | null;
}

export async function fetchUsers(): Promise<UserWithRisk[]> {
  return apiFetch<UserWithRisk[]>("/admin/users");
}

// ── Employee Directory & Groups ──────────────────────────────────────────────

export interface Employee {
  employee_id: number;
  name: string;
  email: string;
  department: string | null;
  phone: string | null;
  status: "active" | "removed";
}

export interface GroupSummary {
  group_id: number;
  group_name: string;
  description?: string | null;
  members: number;
  last_activity?: string | null;
}

export interface UploadSummary {
  imported: number;
  skipped: number;
  new_groups_created: number;
}

export async function uploadEmployeesCsv(file: File): Promise<UploadSummary> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`/api/admin/users/upload-csv`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `CSV upload failed (${res.status})`);
  }

  return res.json();
}

export async function fetchGroups(): Promise<GroupSummary[]> {
  return apiFetch<GroupSummary[]>("/admin/groups");
}

export async function createGroup(payload: {
  group_name: string;
  description?: string;
  member_emails?: string[];
}): Promise<GroupSummary> {
  return apiFetch<GroupSummary>("/admin/groups/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGroupMembers(groupId: number): Promise<Employee[]> {
  return apiFetch<Employee[]>(`/admin/groups/${groupId}/members`);
}

export async function updateEmployee(payload: {
  employee_id?: number;
  email?: string;
  name?: string;
  phone?: string;
  department?: string | null;
  status?: "active" | "removed";
}): Promise<Employee> {
  return apiFetch<Employee>("/admin/users/update", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function removeEmployee(employee_id: number): Promise<void> {
  await apiFetch<unknown>(`/admin/users/${employee_id}/remove`, {
    method: "POST",
  });
}

// ── Events (report phishing, VirusTotal) ──────────────────────────────────────

export interface ReportPhishingPayload {
  user_id: number;
  campaign_id: number;
  reason_selected: string;
  reported_url?: string | null;
}

export interface VirusTotalResult {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  permalink: string | null;
  error: string | null;
  status?: string | null;
}

export interface ReportPhishingResponse {
  success: boolean;
  reason_matched: boolean;
  awareness_score: number;
  vulnerability_score: number;
  detection_accuracy: number;
  vt_checked?: boolean;
  vt_result?: VirusTotalResult | null;
}

export async function reportPhishing(payload: ReportPhishingPayload): Promise<ReportPhishingResponse> {
  return apiFetch<ReportPhishingResponse>("/events/report-phishing", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface CheckUrlPayload {
  url: string;
}

export interface CheckUrlResponse {
  checked: boolean;
  result?: VirusTotalResult | null;
  error?: string | null;
}

export async function checkUrlWithVirusTotal(payload: CheckUrlPayload): Promise<CheckUrlResponse> {
  return apiFetch<CheckUrlResponse>("/events/check-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkFileUrlWithVirusTotal(payload: CheckUrlPayload): Promise<CheckUrlResponse> {
  return apiFetch<CheckUrlResponse>("/events/check-file-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Chatbot ──────────────────────────────────────────────────────────────────

export interface ChatPayload {
  session_id: string;
  role: string;
  user_id: string;
  query: string;
}

export async function chatAsk(payload: ChatPayload): Promise<{ response: string }> {
  return apiFetch<{ response: string }>("/chat/ask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
