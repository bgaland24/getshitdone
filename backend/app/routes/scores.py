"""
Blueprint scores — calcul et exposition du score d'intentionnalité.
"""

from flask import Blueprint, request, g

from app.services.score_service import ScoreService
from app.utils.auth_decorator import require_auth
from app.utils.response import success, error

scores_blueprint = Blueprint("scores", __name__, url_prefix="/api/scores")
score_service = ScoreService()


@scores_blueprint.get("/today")
@require_auth
def get_today_scores():
    """Retourne le score global et les 3 sous-scores du jour."""
    scores = score_service.compute_today_scores(g.current_user.id)
    return success(scores)


@scores_blueprint.get("/weekly")
@require_auth
def get_weekly_scores():
    """Retourne les scores de la semaine en cours avec détail par catégorie."""
    scores = score_service.compute_weekly_scores(g.current_user.id)
    return success(scores)


@scores_blueprint.get("/history")
@require_auth
def get_scores_history():
    """Retourne l'historique des scores sur N semaines (défaut : 4)."""
    try:
        weeks = int(request.args.get("weeks", 4))
        if weeks < 1 or weeks > 52:
            return error("Le paramètre weeks doit être entre 1 et 52")
    except ValueError:
        return error("Le paramètre weeks doit être un entier")

    history = score_service.compute_history(g.current_user.id, weeks)
    return success(history)
