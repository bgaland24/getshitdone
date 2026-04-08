"""
Service métier orchestrant l'extraction et la persistance des sujets et tâches.
"""

from typing import List, Dict, Any

from app.models.subject import Subject
from app.models.task import Task
from app.repositories.subject_repository import SubjectRepository
from app.repositories.task_repository import TaskRepository
from app.services.claude_service import ClaudeService, ExtractionResult


class TaskService:
    """Orchestre l'extraction Claude et la persistence des sujets et tâches."""

    def __init__(
        self,
        subject_repository: SubjectRepository,
        task_repository: TaskRepository,
    ):
        self._subjects = subject_repository
        self._tasks = task_repository

    def process_dictation(
        self, user_id: int, user_input: str, claude_service: ClaudeService
    ) -> Dict[str, Any]:
        """
        Traite une dictée : appelle Claude, persiste les entités extraites,
        et retourne un résumé de ce qui a été créé.
        """
        # Récupère les sujets actifs pour les passer en contexte à Claude
        active_subjects = self._subjects.find_active_by_user(user_id)
        existing_subjects_context = [
            {"id": s.id, "title": s.title} for s in active_subjects
        ]

        extraction: ExtractionResult = claude_service.extract_from_dictation(
            user_input, existing_subjects_context
        )

        # Mappe titre → id pour les nouveaux sujets créés lors de ce traitement
        subject_title_to_id: Dict[str, int] = {
            s.title: s.id for s in active_subjects
        }

        created_subjects: List[Subject] = []
        created_tasks: List[Task] = []

        # Persistance des sujets extraits
        for extracted_subject in extraction.subjects:
            if extracted_subject.is_new and extracted_subject.title:
                new_subject = self._subjects.create(
                    user_id=user_id,
                    title=extracted_subject.title,
                    description=extracted_subject.description,
                    priority=extracted_subject.priority,
                )
                subject_title_to_id[extracted_subject.title] = new_subject.id
                created_subjects.append(new_subject)
            elif not extracted_subject.is_new and extracted_subject.existing_id:
                # Mise à jour de la priorité si Claude a détecté un changement
                existing = self._subjects.find_by_id(extracted_subject.existing_id)
                if existing and extracted_subject.priority > existing.priority:
                    self._subjects.update(
                        existing.id,
                        existing.title,
                        existing.description,
                        extracted_subject.priority,
                    )

        # Persistance des tâches extraites
        for extracted_task in extraction.tasks:
            if not extracted_task.title:
                continue

            # Résolution du subject_id
            subject_id = extracted_task.subject_id
            if not subject_id and extracted_task.subject_title:
                subject_id = subject_title_to_id.get(extracted_task.subject_title)

            new_task = self._tasks.create(
                user_id=user_id,
                title=extracted_task.title,
                description=extracted_task.description,
                priority=extracted_task.priority,
                urgency_level=extracted_task.urgency_level,
                deadline=extracted_task.deadline,
                subject_id=subject_id,
            )
            created_tasks.append(new_task)

        return {
            "created_subjects": created_subjects,
            "created_tasks": created_tasks,
        }

    def get_overview(self, user_id: int) -> Dict[str, Any]:
        """
        Retourne la vue d'ensemble : sujets actifs avec leurs tâches,
        et tâches sans sujet.
        """
        active_subjects = self._subjects.find_active_by_user(user_id)

        subjects_with_tasks = []
        for subject in active_subjects:
            tasks = self._tasks.find_active_by_subject(subject.id)
            subjects_with_tasks.append({"subject": subject, "tasks": tasks})

        standalone_tasks = self._tasks.find_standalone_active_by_user(user_id)

        return {
            "subjects_with_tasks": subjects_with_tasks,
            "standalone_tasks": standalone_tasks,
        }

    def get_todo_list(self, user_id: int) -> List[Task]:
        """
        Retourne la liste de toutes les tâches actives triées par urgence
        puis priorité puis deadline.
        """
        return self._tasks.find_active_by_user(user_id)

    def complete_task(self, task_id: int, user_id: int) -> bool:
        """
        Marque une tâche comme complétée. Vérifie l'appartenance à l'utilisateur.
        Retourne True si l'opération a réussi.
        """
        task = self._tasks.find_by_id(task_id)
        if not task or task.user_id != user_id:
            return False
        self._tasks.mark_completed(task_id)
        return True

    def archive_task(self, task_id: int, user_id: int) -> bool:
        """
        Archive une tâche. Vérifie l'appartenance à l'utilisateur.
        Retourne True si l'opération a réussi.
        """
        task = self._tasks.find_by_id(task_id)
        if not task or task.user_id != user_id:
            return False
        self._tasks.archive(task_id)
        return True

    def archive_subject(self, subject_id: int, user_id: int) -> bool:
        """
        Archive un sujet et ses tâches actives. Vérifie l'appartenance.
        Retourne True si l'opération a réussi.
        """
        subject = self._subjects.find_by_id(subject_id)
        if not subject or subject.user_id != user_id:
            return False
        self._subjects.archive(subject_id)
        return True
