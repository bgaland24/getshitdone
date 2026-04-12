"""
Service d'envoi d'emails transactionnels via Gmail SMTP SSL.
Utilise smtplib de la bibliothèque standard — aucune dépendance externe requise.
"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 465


class EmailService:
    """Envoi d'emails transactionnels via un compte Gmail avec App Password."""

    def __init__(self, gmail_user: str, gmail_app_password: str) -> None:
        self._gmail_user = gmail_user
        self._gmail_app_password = gmail_app_password

    def send_password_reset(self, recipient_email: str, reset_link: str) -> None:
        """Envoie l'email de réinitialisation de mot de passe au destinataire."""
        subject = "Réinitialisation de votre mot de passe — GetShitDone"

        body_text = (
            f"Bonjour,\n\n"
            f"Vous avez demandé à réinitialiser votre mot de passe sur GetShitDone.\n\n"
            f"Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :\n"
            f"{reset_link}\n\n"
            f"Ce lien est valable 15 minutes et ne peut être utilisé qu'une seule fois.\n\n"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — "
            f"votre mot de passe restera inchangé.\n\n"
            f"L'équipe GetShitDone"
        )

        body_html = (
            f"<html><body style='font-family: sans-serif; color: #333;'>"
            f"<p>Bonjour,</p>"
            f"<p>Vous avez demandé à réinitialiser votre mot de passe sur <strong>GetShitDone</strong>.</p>"
            f"<p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>"
            f"<p style='margin: 24px 0;'>"
            f"<a href='{reset_link}' style='background:#7c3aed;color:#fff;padding:12px 24px;"
            f"border-radius:6px;text-decoration:none;font-weight:bold;'>"
            f"Réinitialiser mon mot de passe</a></p>"
            f"<p style='font-size:12px;color:#888;'>Ce lien est valable <strong>15 minutes</strong> "
            f"et ne peut être utilisé qu'une seule fois.<br>"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>"
            f"</body></html>"
        )

        self._send(recipient_email, subject, body_text, body_html)

    def _send(self, to: str, subject: str, body_text: str, body_html: str) -> None:
        """Ouvre une connexion SMTP SSL vers Gmail et envoie le message."""
        if not self._gmail_user:
            raise RuntimeError("SMTP not configured — GMAIL_USER est vide")

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = self._gmail_user
        message["To"] = to

        # Ordre important : text d'abord, html en dernier (le client affiche le dernier supporté)
        message.attach(MIMEText(body_text, "plain", "utf-8"))
        message.attach(MIMEText(body_html, "html", "utf-8"))

        try:
            with smtplib.SMTP_SSL(GMAIL_SMTP_HOST, GMAIL_SMTP_PORT) as server:
                server.login(self._gmail_user, self._gmail_app_password)
                server.sendmail(self._gmail_user, to, message.as_string())
        except smtplib.SMTPException as exc:
            raise RuntimeError(f"Échec de l'envoi SMTP : {exc}") from exc
