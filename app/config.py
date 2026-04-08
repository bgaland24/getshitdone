"""
Configuration centrale de l'application.
Toutes les constantes et paramètres configurables sont définis ici.
"""

import os

# ---------------------------------------------------------------------------
# Base de données
# ---------------------------------------------------------------------------
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "..", "database", "getshitdone.db")

# ---------------------------------------------------------------------------
# Sécurité Flask
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "changez-cette-valeur-en-production")

# Durée de validité d'une session utilisateur (en secondes)
SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30  # 30 jours

# Durée de validité d'un code de vérification email (en secondes)
VERIFICATION_CODE_LIFETIME_SECONDS = 60 * 15  # 15 minutes

# Durée de validité d'un code de connexion magique (en secondes)
MAGIC_CODE_LIFETIME_SECONDS = 60 * 10  # 10 minutes

# ---------------------------------------------------------------------------
# SMTP — Email sortant
# ---------------------------------------------------------------------------
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USE_TLS = True
SMTP_USERNAME = "admin.bgg@gmail.com"       # À renseigner
SMTP_PASSWORD = "admin_SBLV_2019!"  # Mot de passe d'application Gmail
SMTP_SENDER_NAME = "GetShitDone"
SMTP_SENDER_EMAIL = SMTP_USERNAME

# ---------------------------------------------------------------------------
# Claude API
# ---------------------------------------------------------------------------
# Modèle utilisé pour l'extraction de tâches.
# Modifiable ici pour toute l'application (futur panel admin en V2/V3).
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# Nombre maximum de tokens pour la réponse de Claude
CLAUDE_MAX_TOKENS = 2048

# Température pour les appels Claude (0 = déterministe, 1 = créatif)
CLAUDE_TEMPERATURE = 0.2

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
APP_NAME = "GetShitDone"

# Niveaux d'urgence (valeur entière → libellé)
URGENCY_LEVELS = {
    0: "Aucune",
    1: "Faible",
    2: "Moyenne",
    3: "Urgente",
    4: "Critique",
}

# Niveaux de priorité (valeur entière → libellé)
PRIORITY_LEVELS = {
    0: "Aucune",
    1: "Faible",
    2: "Moyenne",
    3: "Haute",
}

# Statuts possibles pour sujets et tâches
STATUS_ACTIVE = "active"
STATUS_COMPLETED = "completed"
STATUS_ARCHIVED = "archived"
