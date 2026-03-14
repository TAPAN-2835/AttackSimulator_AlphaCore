"""
Static simulation template registry.
Each template maps to a phishing scenario with pre-written subject/body.
Served via GET /templates/ and GET /templates/{template_id}.
"""

TEMPLATES: dict[str, dict] = {
    "urgent_invoice": {
        "id": "urgent_invoice",
        "name": "Urgent Invoice #4821",
        "type": "phishing",
        "difficulty": "medium",
        "subject": "URGENT: Invoice #4821 – Immediate Payment Required",
        "body": (
            "Dear {employee_name},\n\n"
            "We have received an outstanding invoice (#4821) associated with your account "
            "that requires immediate attention.\n\n"
            "Failure to review and approve this invoice within 24 hours may result in "
            "service interruption.\n\n"
            "Please click the button below to view and approve the invoice securely.\n\n"
            "[View Invoice]\n\n"
            "Finance & Accounts Team"
        ),
        "cta_text": "View Invoice",
        "landing_page": "/phish/invoice",
    },
    "m365_reauth": {
        "id": "m365_reauth",
        "name": "Microsoft 365 Re-authentication",
        "type": "credential",
        "difficulty": "high",
        "subject": "Action Required: Microsoft 365 Session Expiring",
        "body": (
            "Dear {employee_name},\n\n"
            "Your Microsoft 365 session has expired due to a recent security policy update.\n\n"
            "To avoid service disruption and maintain access to your emails, files, and "
            "Teams meetings, please re-authenticate your account immediately.\n\n"
            "Click the button below to verify your identity and restore access.\n\n"
            "[Re-authenticate Now]\n\n"
            "IT Security Team"
        ),
        "cta_text": "Re-authenticate Now",
        "landing_page": "/phish/m365-login",
    },
    "salary_increase": {
        "id": "salary_increase",
        "name": "Salary Increase Notification",
        "type": "phishing",
        "difficulty": "high",
        "subject": "Confidential: Your Salary Increase Notification",
        "body": (
            "Dear {employee_name},\n\n"
            "We are pleased to inform you that based on your recent performance review, "
            "you have been approved for a salary increase effective this quarter.\n\n"
            "Details of your updated compensation package are available in a confidential "
            "document. Please click below to securely view your offer letter.\n\n"
            "[View Details]\n\n"
            "Human Resources Department"
        ),
        "cta_text": "View Details",
        "landing_page": "/phish/salary",
    },
    "it_maintenance": {
        "id": "it_maintenance",
        "name": "IT System Maintenance",
        "type": "malware",
        "difficulty": "low",
        "subject": "Scheduled: Mandatory IT Maintenance Tool Update",
        "body": (
            "Dear {employee_name},\n\n"
            "Our IT department will be conducting essential system maintenance this weekend. "
            "All employees are required to run the attached diagnostic tool to ensure "
            "your workstation is compatible with the upcoming infrastructure upgrade.\n\n"
            "Please download and run the tool before Friday 5:00 PM to avoid any disruption "
            "to your access credentials.\n\n"
            "[Download Tool]\n\n"
            "IT Operations Team"
        ),
        "cta_text": "Download Tool",
        "landing_page": "/phish/it-tool",
    },
    "parking_ticket": {
        "id": "parking_ticket",
        "name": "Unpaid Parking Ticket",
        "type": "phishing",
        "difficulty": "medium",
        "subject": "Notice: Unpaid Parking Violation – Action Required",
        "body": (
            "Dear {employee_name},\n\n"
            "Our records indicate that you have an outstanding parking violation associated "
            "with your registered vehicle on company premises.\n\n"
            "To avoid an escalation fee, please settle the amount within 48 hours using "
            "our secure payment portal.\n\n"
            "[Pay Fine]\n\n"
            "Facilities Management Office"
        ),
        "cta_text": "Pay Fine",
        "landing_page": "/phish/parking",
    },
    "vpn_update": {
        "id": "vpn_update",
        "name": "Corporate VPN Update",
        "type": "credential",
        "difficulty": "medium",
        "subject": "Action Required: Corporate VPN Certificate Renewal",
        "body": (
            "Dear {employee_name},\n\n"
            "Your corporate VPN certificate is expiring in 48 hours. To maintain secure "
            "remote access, you must update your VPN credentials before the deadline.\n\n"
            "Failure to update may result in loss of remote access to internal systems "
            "and files.\n\n"
            "Click below to update your VPN credentials securely.\n\n"
            "[Update Now]\n\n"
            "Network Security Team"
        ),
        "cta_text": "Update Now",
        "landing_page": "/phish/vpn",
    },
}


def get_all_templates() -> list[dict]:
    return list(TEMPLATES.values())


def get_template(template_id: str) -> dict | None:
    return TEMPLATES.get(template_id)
