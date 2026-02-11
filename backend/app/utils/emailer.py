import os
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr
import logging


logger = logging.getLogger("backend.email")


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
FROM_EMAIL = os.getenv("FROM_EMAIL", "no-reply@example.com")
FROM_NAME = os.getenv("FROM_NAME", "UI-for-HUY")


def send_email(to_email: str, subject: str, body: str) -> bool:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP not configured, printing email instead.")
        print(f"[EMAIL MOCK]\nTo: {to_email}\nSubject: {subject}\n{body}")
        return False
    msg = MIMEText(body, "plain", "utf-8")
    msg["From"] = formataddr((FROM_NAME, FROM_EMAIL))
    msg["To"] = to_email
    msg["Subject"] = subject
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.error("Failed to send email: %s", exc)
        return False
