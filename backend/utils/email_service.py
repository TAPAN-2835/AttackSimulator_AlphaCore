import logging
import os
import smtplib
from email.message import EmailMessage

from config import get_settings, get_base_url
from campaigns.models import CampaignTarget, SimulationToken

settings = get_settings()
logger = logging.getLogger(__name__)

def send_phishing_emails(
    targets: list[CampaignTarget],
    tokens: list[SimulationToken],
    campaign_id: int,
    template_name: str = "password_reset",
    custom_subject: str | None = None,
    custom_body: str | None = None,
) -> None:
    """
    Sends real emails via SMTP using Python's built-in smtplib.
    Requires SMTP environment variables to be set in .env.

    If custom_subject / custom_body are provided (from template-based campaign creation),
    they are used directly instead of the Jinja HTML template files.
    """
    smtp_server = getattr(settings, "SMTP_SERVER", "")
    smtp_port = int(getattr(settings, "SMTP_PORT", "587"))
    smtp_user = getattr(settings, "SMTP_USER", "")
    smtp_pass = getattr(settings, "SMTP_PASSWORD", "")
    smtp_from = getattr(settings, "SMTP_FROM", "simulator@alphacore.io")

    if not smtp_server or not smtp_user or not smtp_pass:
        error_msg = (
            "[SMTP EMAIL FAILED] SMTP credentials are not configured in Render environment variables. "
            "Please set SMTP_SERVER, SMTP_USER, and SMTP_PASSWORD."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)

    # ── Determine rendering mode ─────────────────────────────────────────────
    use_custom_body = bool(custom_body)

    if not use_custom_body:
        # Fall back to Jinja HTML template files
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
            jinja_template = env.get_template(f"{template_name}.html")
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

            base_url = get_base_url()

            for target, token in zip(targets, tokens):
                # Unique tracking link: /sim/{token} on the public backend domain
                sim_link = f"{base_url}/phish/{token.token}"
                target_id = getattr(target, 'user_id', None) or getattr(target, 'id', None)
                tracking_pixel_url = (
                    f"{base_url}/sim/open"
                    f"?user_id={target_id}&campaign_id={campaign_id}"
                )

                target_name = getattr(target, 'name', None) or "Employee"

                # ── Build HTML content ────────────────────────────────────────
                if use_custom_body:
                    # Render inline from the custom body stored with the campaign
                    # Use replace instead of format to avoid KeyErrors from stray {} brackets in user's text
                    rendered_body = custom_body.replace("{employee_name}", str(target_name))
                    # Replace [CTA] placeholders (any bracket text) with real link
                    import re
                    def replace_cta(match):
                        label = match.group(1)
                        return (
                            f'<a href="{sim_link}" style="display:inline-block;padding:10px 20px;'
                            f'background:#0078d4;color:#fff;text-decoration:none;border-radius:4px;'
                            f'font-weight:bold;">{label}</a>'
                        )
                    html_body_lines = []
                    for line in rendered_body.split("\n"):
                        line_html = re.sub(r'\[([^\]]+)\]', replace_cta, line)
                        if line_html.strip() == "":
                            html_body_lines.append("<br>")
                        else:
                            html_body_lines.append(f"<p style='margin:6px 0'>{line_html}</p>")

                    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:30px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:30px;border-radius:8px;border:1px solid #ddd;">
    <img src="{tracking_pixel_url}" width="1" height="1" style="display:none" alt="">
    {"".join(html_body_lines)}
  </div>
</body>
</html>"""
                else:
                    html_content = jinja_template.render(
                        employee_name=target_name,
                        phishing_link=sim_link,
                        user_id=target_id,
                        campaign_id=campaign_id,
                        tracking_pixel_url=tracking_pixel_url,
                    )

                # ── Construct and send the message ────────────────────────────
                email_subject = custom_subject or "Important: Action Required"

                msg = EmailMessage()
                msg['Subject'] = email_subject
                msg['From'] = smtp_from
                msg['To'] = target.email

                msg.set_content("Please enable HTML to view this message.")
                msg.add_alternative(html_content, subtype='html')

                try:
                    server.send_message(msg)
                    logger.info(f"[SMTP EMAIL SUCCESS] Sent to: {target.email}")
                except Exception as send_err:
                    logger.error(f"[SMTP EMAIL FAILED] Could not send to {target.email}: {send_err}")
                    raise send_err

    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(
            f"[SMTP EMAIL FAILED] Authentication error — check SMTP_USER and SMTP_PASSWORD "
            f"(use a Gmail App Password, not your account password): {auth_err}"
        )
    except Exception as e:
        logger.error(f"[SMTP EMAIL FAILED] Unexpected error: {e}")