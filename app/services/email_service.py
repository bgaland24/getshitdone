"""
Service d'envoi d'emails via SMTP Gmail.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app import config


class EmailService:
    """Gère l'envoi des emails transactionnels de l'application."""

    def _build_message(self, to_email: str, subject: str, html_body: str) -> MIMEMultipart:
        """Construit un objet email MIME prêt à l'envoi."""
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{config.SMTP_SENDER_NAME} <{config.SMTP_SENDER_EMAIL}>"
        message["To"] = to_email
        message.attach(MIMEText(html_body, "html", "utf-8"))
        return message

    def _send(self, to_email: str, message: MIMEMultipart) -> None:
        """Établit la connexion SMTP et envoie le message."""
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
            if config.SMTP_USE_TLS:
                server.starttls()
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            server.sendmail(config.SMTP_SENDER_EMAIL, to_email, message.as_string())

    def send_verification_code(self, to_email: str, code: str) -> None:
        """Envoie le code de vérification lors de la création du compte."""
        subject = f"[{config.APP_NAME}] Vérification de votre email"
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2>Bienvenue sur {config.APP_NAME}</h2>
            <p>Votre code de vérification est :</p>
            <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.3rem;
                        text-align: center; padding: 1rem; background: #f0f0f0;
                        border-radius: 8px; margin: 1rem 0;">
                {code}
            </div>
            <p style="color: #888; font-size: 0.85rem;">
                Ce code est valable 15 minutes. Ne le partagez pas.
            </p>
        </div>
        """
        message = self._build_message(to_email, subject, html_body)
        self._send(to_email, message)

    def send_magic_login_code(self, to_email: str, code: str) -> None:
        """Envoie un code de connexion magique (login sans mot de passe)."""
        subject = f"[{config.APP_NAME}] Votre code de connexion"
        html_body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
            <h2>Connexion à {config.APP_NAME}</h2>
            <p>Votre code de connexion est :</p>
            <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.3rem;
                        text-align: center; padding: 1rem; background: #f0f0f0;
                        border-radius: 8px; margin: 1rem 0;">
                {code}
            </div>
            <p style="color: #888; font-size: 0.85rem;">
                Ce code est valable 10 minutes. Ne le partagez pas.<br>
                Si vous n'avez pas demandé ce code, ignorez cet email.
            </p>
        </div>
        """
        message = self._build_message(to_email, subject, html_body)
        self._send(to_email, message)
