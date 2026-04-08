"""
Tests unitaires des règles métier critiques du TaskService.
"""

import pytest
from app import create_app
from app.database import db as _db
from app.services.task_service import TaskService
from app.models.task import Task
from app.models.category import Category
from app.models.user import User
from datetime import date


@pytest.fixture(scope="module")
def app():
    import os
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    flask_app = create_app("development")
    flask_app.config["TESTING"] = True
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.drop_all()


@pytest.fixture(autouse=True)
def clean(app):
    with app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


@pytest.fixture
def ctx(app):
    with app.app_context():
        yield app


def _create_user(email="user@test.com"):
    import bcrypt
    user = User(
        email=email,
        password_hash=bcrypt.hashpw(b"password", bcrypt.gensalt()).decode(),
    )
    _db.session.add(user)
    _db.session.flush()
    return user


def _create_task(user_id, category_id=None, status="backlog"):
    task = Task(user_id=user_id, title="Tâche test", status=status, category_id=category_id)
    _db.session.add(task)
    _db.session.flush()
    return task


class TestIsQualified:
    """Vérifie le calcul automatique de is_qualified."""

    def test_not_qualified_by_default(self, ctx):
        with ctx.app_context():
            user = _create_user()
            task = _create_task(user.id)
            assert task.is_qualified is False

    def test_qualified_when_all_criteria_set(self, ctx):
        with ctx.app_context():
            user = _create_user()
            task = _create_task(user.id)
            svc = TaskService()
            svc.qualify_task(task, "urgent", "important", "day")
            assert task.is_qualified is True

    def test_not_qualified_if_missing_one_criterion(self, ctx):
        with ctx.app_context():
            user = _create_user()
            task = _create_task(user.id)
            task.urgency = "urgent"
            task.importance = "important"
            # horizon manquant
            task.recalculate_is_qualified()
            assert task.is_qualified is False


class TestMaxTodayTasks:
    """Vérifie la limite de 3 tâches today par priority_date."""

    def test_cannot_add_more_than_3_today(self, ctx):
        with ctx.app_context():
            user = _create_user()
            svc = TaskService()
            tomorrow = date.today()

            for _ in range(3):
                task = _create_task(user.id, status="backlog")
                svc.prioritize_task(task, tomorrow, user.id)

            task_4 = _create_task(user.id, status="backlog")
            with pytest.raises(ValueError, match="Maximum"):
                svc.prioritize_task(task_4, tomorrow, user.id)

    def test_can_add_up_to_3_today(self, ctx):
        with ctx.app_context():
            user = _create_user()
            svc = TaskService()
            tomorrow = date.today()

            for _ in range(3):
                task = _create_task(user.id, status="backlog")
                result = svc.prioritize_task(task, tomorrow, user.id)
                assert result.status == "today"


class TestPrepareTomorrow:
    """Vérifie que prepare_tomorrow remet les tâches today en backlog."""

    def test_today_tasks_moved_to_backlog(self, ctx):
        with ctx.app_context():
            user = _create_user()
            svc = TaskService()
            tomorrow = date.today()

            task = _create_task(user.id, status="backlog")
            svc.prioritize_task(task, tomorrow, user.id)
            assert task.status == "today"

            result = svc.prepare_tomorrow(user.id)
            assert result["tasks_reset"] == 1
            assert task.status == "backlog"
            assert len(task.get_missed_dates()) == 1

    def test_done_tasks_not_affected(self, ctx):
        with ctx.app_context():
            user = _create_user()
            svc = TaskService()

            done_task = _create_task(user.id, status="done")
            svc.prepare_tomorrow(user.id)
            assert done_task.status == "done"
