import logging
import smtplib
from email.message import EmailMessage
from config import get_settings
from campaigns.models import CampaignTarget, SimulationToken

settings = get_settings()
logger = logging.getLogger(__name__)

import os

def send_phishing_emails(
    targets: list[CampaignTarget],
    tokens: list[SimulationToken],
    campaign_id: int,
    template_name: str = "password_reset"
) -> None:
    """
    Sends real emails via SMTP using Python's built-in smtplib.
    Requires SMTP environment variables to be set in .env.
    """
    smtp_server = getattr(settings, "SMTP_SERVER", "")
    smtp_port = int(getattr(settings, "SMTP_PORT", "587"))
    smtp_user = getattr(settings, "SMTP_USER", "")
    smtp_pass = getattr(settings, "SMTP_PASSWORD", "")
    smtp_from = getattr(settings, "SMTP_FROM", "simulator@alphacore.io")

    if not smtp_server or not smtp_user or not smtp_pass:
        logger.error(
            "[SMTP EMAIL FAILED] SMTP credentials are not configured. "
            "Set SMTP_SERVER, SMTP_USER, and SMTP_PASSWORD in .env to send real emails. "
            "No emails were sent."
        )
        return

    if not template_name:
        logger.error("[SMTP EMAIL FAILED] send_phishing_emails called without template_name")
        return

    # Clean extension if provided to avoid duplicate .html.html
    if template_name.endswith(".html"):
        template_name = template_name[:-5]

    from jinja2 import Environment, FileSystemLoader

    # Load HTML template using Jinja2 with the correct template directory
    template_dir = os.path.join(os.path.dirname(__file__), "..", "email_templates")
    template_dir = os.path.abspath(template_dir)
    env = Environment(loader=FileSystemLoader(template_dir))

    try:
        template = env.get_template(f"{template_name}.html")
        logger.info(f"Loaded email template: {template_name}.html")
    except Exception as e:
        logger.error(f"[SMTP EMAIL FAILED] Could not load template '{template_name}': {e}")
        return  # Do NOT silently replace with a different template

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)

            for target, token in zip(targets, tokens):
                # Prefer user_id (FK to users table), fall back to row id
                target_id = getattr(target, 'user_id', None) or getattr(target, 'id', None)
                sim_link = f"{settings.SIM_BASE_URL}/sim/track?user_id={target_id}&campaign_id={campaign_id}"
                tracking_pixel_url = (
                    f"{settings.SIM_BASE_URL}/sim/open"
                    f"?user_id={target_id}&campaign_id={campaign_id}"
                )

                target_name = getattr(target, 'name', None) or "Employee"

                html_content = template.render(
                    employee_name=target_name,
                    phishing_link=sim_link,
                    user_id=target_id,
                    campaign_id=campaign_id,
                    tracking_pixel_url=tracking_pixel_url,
                )

                msg = EmailMessage()
                msg['Subject'] = 'Important: Action Required'
                msg['From'] = smtp_from
                msg['To'] = target.email

                msg.set_content("Please enable HTML to view this message.")
                msg.add_alternative(html_content, subtype='html')

                try:
                    server.send_message(msg)
                    logger.info(f"[SMTP EMAIL SUCCESS] Sent to: {target.email}")
                except Exception as send_err:
                    logger.error(f"[SMTP EMAIL FAILED] Could not send to {target.email}: {send_err}")

    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(
            f"[SMTP EMAIL FAILED] Authentication error — check SMTP_USER and SMTP_PASSWORD "
            f"(use a Gmail App Password, not your account password): {auth_err}"
        )
    except Exception as e:
        logger.error(f"[SMTP EMAIL FAILED] Unexpected error: {e}")