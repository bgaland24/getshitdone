"""
ScoreService — calcul du score d'intentionnalité et de ses 3 sous-scores.

Score global = moyenne pondérée :
  - 40% : Respect des priorités (tâches today done / définies sur 7 jours glissants)
  - 40% : Respect des allocations temporelles (temps réel vs cible par catégorie, semaine en cours)
  - 20% : Qualité de clôture (sessions efficient / sessions avec clôture done sur 7 jours)
"""

from datetime import datetime, timezone, timedelta, date

from app.database import db
from app.models.task import Task
from app.models.work_session import WorkSession
from app.models.category import Category

# Pondérations des sous-scores
WEIGHT_PRIORITIES = 0.40
WEIGHT_ALLOCATIONS = 0.40
WEIGHT_CLOSURE = 0.20

# Bonus si priorités définies avant 20h la veille
PRIORITY_BONUS = 10


class ScoreService:
    """Service de calcul du score d'intentionnalité."""

    def compute_today_scores(self, user_id: str) -> dict:
        """
        Calcule les scores du jour : score global + 3 sous-scores.
        Fenêtre glissante de 7 jours pour les priorités et la clôture.
        Semaine en cours (lundi → dimanche) pour les allocations.
        """
        score_priorities = self._compute_priorities_score(user_id)
        score_allocations = self._compute_allocations_score(user_id)
        score_closure = self._compute_closure_score(user_id)

        global_score = round(
            score_priorities * WEIGHT_PRIORITIES
            + score_allocations * WEIGHT_ALLOCATIONS
            + score_closure * WEIGHT_CLOSURE
        )

        return {
            "global": global_score,
            "priorities": round(score_priorities),
            "allocations": round(score_allocations),
            "closure": round(score_closure),
        }

    def compute_weekly_scores(self, user_id: str) -> dict:
        """Calcule les scores pour la semaine en cours avec le détail par catégorie."""
        base_scores = self.compute_today_scores(user_id)
        category_breakdown = self._compute_category_breakdown(user_id)

        return {**base_scores, "categories": category_breakdown}

    def compute_history(self, user_id: str, weeks: int = 4) -> list:
        """
        Calcule les scores pour les N dernières semaines.
        Retourne une liste de dicts {week_start, global, priorities, allocations, closure}.
        """
        history = []
        today = datetime.now(timezone.utc).date()
        current_monday = today - timedelta(days=today.weekday())

        for week_offset in range(weeks):
            week_start = current_monday - timedelta(weeks=week_offset)
            week_end = week_start + timedelta(days=6)
            scores = self._compute_scores_for_period(user_id, week_start, week_end)
            history.append({"week_start": week_start.isoformat(), **scores})

        return history

    def _compute_priorities_score(self, user_id: str) -> float:
        """
        Sous-score priorités (7 jours glissants).
        score = (tâches today done / tâches today définies) × 100
        Bonus +10 si priorités définies avant 20h la veille (non implémenté dans ce MVP).
        Score 0 pour un jour sans priorités définies.
        """
        since = datetime.now(timezone.utc) - timedelta(days=7)

        # Tâches qui avaient status today avec priority_date dans la fenêtre (done ou missed)
        all_priority_tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.priority_date >= since.date(),
            Task.priority_date <= datetime.now(timezone.utc).date(),
        ).all()

        if not all_priority_tasks:
            return 0.0

        done_count = sum(1 for t in all_priority_tasks if t.status == "done")
        total_count = len(all_priority_tasks)

        return (done_count / total_count) * 100

    def _compute_allocations_score(self, user_id: str) -> float:
        """
        Sous-score allocations temporelles (semaine en cours lundi → dimanche).
        Pour chaque catégorie avec cible > 0 :
          ratio = temps_réel / temps_cible
          score_catégorie = min(ratio, 1) × 100
        score_allocations = moyenne des score_catégorie
        """
        monday, sunday = _get_current_week_bounds()

        categories = Category.query.filter_by(user_id=user_id).all()
        categories_with_targets = [c for c in categories if c.weekly_target_minutes > 0]

        if not categories_with_targets:
            return 0.0

        scores = []
        for category in categories_with_targets:
            actual_minutes = _compute_actual_minutes_for_category(
                user_id, category.id, monday, sunday
            )
            ratio = actual_minutes / category.weekly_target_minutes
            scores.append(min(ratio, 1.0) * 100)

        return sum(scores) / len(scores)

    def _compute_closure_score(self, user_id: str) -> float:
        """
        Sous-score qualité de clôture (7 jours glissants).
        score = (sessions efficient / sessions avec tâche clôturée done) × 100
        """
        since = datetime.now(timezone.utc) - timedelta(days=7)

        # Sessions clôturées dans la fenêtre
        closed_sessions = (
            WorkSession.query
            .join(Task, WorkSession.task_id == Task.id)
            .filter(
                Task.user_id == user_id,
                WorkSession.stopped_at.isnot(None),
                WorkSession.stopped_at >= since,
            )
            .all()
        )

        sessions_with_closure = [s for s in closed_sessions if s.efficient is not None]
        if not sessions_with_closure:
            return 0.0

        efficient_count = sum(1 for s in sessions_with_closure if s.efficient is True)
        return (efficient_count / len(sessions_with_closure)) * 100

    def _compute_category_breakdown(self, user_id: str) -> list:
        """Retourne le détail temps prévu vs réel pour chaque catégorie cette semaine."""
        monday, sunday = _get_current_week_bounds()
        categories = Category.query.filter_by(user_id=user_id).all()

        breakdown = []
        for category in categories:
            actual_minutes = _compute_actual_minutes_for_category(
                user_id, category.id, monday, sunday
            )
            breakdown.append({
                "category_id": category.id,
                "category_name": category.name,
                "category_color": category.color,
                "target_minutes": category.weekly_target_minutes,
                "actual_minutes": actual_minutes,
            })

        return breakdown

    def _compute_scores_for_period(self, user_id: str, week_start: date, week_end: date) -> dict:
        """Calcule les scores pour une semaine spécifique (historique)."""
        # Priorités : tâches done avec priority_date dans la semaine
        priority_tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.priority_date >= week_start,
            Task.priority_date <= week_end,
        ).all()

        if priority_tasks:
            done = sum(1 for t in priority_tasks if t.status == "done")
            score_p = round((done / len(priority_tasks)) * 100)
        else:
            score_p = 0

        # Allocations : temps réel vs cible sur la semaine
        categories = Category.query.filter_by(user_id=user_id).all()
        cats_with_targets = [c for c in categories if c.weekly_target_minutes > 0]
        if cats_with_targets:
            alloc_scores = []
            for cat in cats_with_targets:
                actual = _compute_actual_minutes_for_category(
                    user_id, cat.id, week_start, week_end
                )
                ratio = actual / cat.weekly_target_minutes
                alloc_scores.append(min(ratio, 1.0) * 100)
            score_a = round(sum(alloc_scores) / len(alloc_scores))
        else:
            score_a = 0

        # Clôture : sessions efficient de la semaine
        since = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
        until = datetime.combine(week_end, datetime.max.time()).replace(tzinfo=timezone.utc)
        closed_sessions = (
            WorkSession.query
            .join(Task, WorkSession.task_id == Task.id)
            .filter(
                Task.user_id == user_id,
                WorkSession.stopped_at.isnot(None),
                WorkSession.stopped_at >= since,
                WorkSession.stopped_at <= until,
                WorkSession.efficient.isnot(None),
            )
            .all()
        )
        if closed_sessions:
            efficient = sum(1 for s in closed_sessions if s.efficient is True)
            score_c = round((efficient / len(closed_sessions)) * 100)
        else:
            score_c = 0

        global_score = round(
            score_p * WEIGHT_PRIORITIES
            + score_a * WEIGHT_ALLOCATIONS
            + score_c * WEIGHT_CLOSURE
        )

        return {
            "global": global_score,
            "priorities": score_p,
            "allocations": score_a,
            "closure": score_c,
        }


def _get_current_week_bounds():
    """Retourne le lundi et dimanche de la semaine en cours."""
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def _compute_actual_minutes_for_category(user_id: str, category_id: str, start: date, end: date) -> int:
    """
    Calcule le total de minutes de sessions de travail pour une catégorie sur une période.
    """
    start_dt = datetime.combine(start, datetime.min.time()).replace(tzinfo=timezone.utc)
    end_dt = datetime.combine(end, datetime.max.time()).replace(tzinfo=timezone.utc)

    sessions = (
        WorkSession.query
        .join(Task, WorkSession.task_id == Task.id)
        .filter(
            Task.user_id == user_id,
            Task.category_id == category_id,
            WorkSession.stopped_at.isnot(None),
            WorkSession.started_at >= start_dt,
            WorkSession.started_at <= end_dt,
        )
        .all()
    )
    return sum(s.duration_minutes or 0 for s in sessions)
