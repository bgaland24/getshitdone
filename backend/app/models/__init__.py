"""
Exports de tous les modèles SQLAlchemy.
Importé par la factory Flask pour que SQLAlchemy découvre les tables avant create_all().
"""

from app.models.user import User
from app.models.category import Category
from app.models.deliverable import Deliverable
from app.models.task import Task
from app.models.work_session import WorkSession
from app.models.user_preferences import UserPreferences
from app.models.password_reset_token import PasswordResetToken

__all__ = ["User", "Category", "Deliverable", "Task", "WorkSession", "UserPreferences", "PasswordResetToken"]
