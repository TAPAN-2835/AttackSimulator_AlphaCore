export type ChannelKey = "EMAIL" | "SMS" | "WHATSAPP" | "TELEGRAM" | "INSTAGRAM" | "LINKEDIN";

export interface AttackOption {
  value: string; // backend AttackType enum value
  label: string; // human-readable label
}

/**
 * Core channel → attack mapping used across:
 * - Campaign creation
 * - AI phishing generator
 * - (future) template creation
 */
export const attackOptionsByChannel: Record<ChannelKey, AttackOption[]> = {
  EMAIL: [
    { value: "phishing", label: "Phishing Link" },
    { value: "qr_phishing", label: "QR Code Phishing" },
    { value: "credential_harvest", label: "Credential Harvesting (Fake Login Page)" },
    { value: "malware_download", label: "Malware Attachment" },
    { value: "business_email_compromise", label: "Business Email Compromise" },
    { value: "spear_phishing", label: "Spear Phishing" },
    { value: "incident_drill", label: "Incident Drill" },
    { value: "whaling", label: "Whaling / Executive Target" },
  ],
  SMS: [
    { value: "phishing_link_message", label: "Phishing Link Message" },
    { value: "otp_scam", label: "OTP Scam" },
    { value: "delivery_scam", label: "Delivery Scam" },
    { value: "bank_alert_scam", label: "Bank Alert Scam" },
  ],
  WHATSAPP: [
    { value: "phishing_link_message", label: "Phishing Link Message" },
    { value: "fake_support_message", label: "Fake Support Message" },
    { value: "vishing_voice_file", label: "Vishing Voice File" },
    { value: "payment_request_scam", label: "Payment Request Scam" },
  ],
  TELEGRAM: [
    { value: "phishing_link_message", label: "Phishing Link Message" },
    { value: "fake_support_message", label: "Fake Support Message" },
  ],
  INSTAGRAM: [
    { value: "phishing_link_message", label: "Phishing Link Message" },
    { value: "fake_support_message", label: "Fake Support Message" },
  ],
  LINKEDIN: [
    { value: "phishing_link_message", label: "Phishing Link Message" },
    { value: "fake_support_message", label: "Fake Support Message" },
  ],
};

// Simple label-only mapping kept for convenience / spec compatibility.
export const attackChannels = {
  email: attackOptionsByChannel.EMAIL.map((o) => o.label),
  sms: attackOptionsByChannel.SMS.map((o) => o.label),
  whatsapp: attackOptionsByChannel.WHATSAPP.map((o) => o.label),
  telegram: attackOptionsByChannel.TELEGRAM.map((o) => o.label),
  instagram: attackOptionsByChannel.INSTAGRAM.map((o) => o.label),
  linkedin: attackOptionsByChannel.LINKEDIN.map((o) => o.label),
} as const;

