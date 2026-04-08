"""
Service d'appel à l'API Claude pour l'extraction de sujets et tâches.
"""

import json
from typing import List, Optional
from dataclasses import dataclass

import anthropic

from app import config


@dataclass
class ExtractedTask:
    """Tâche extraite par Claude depuis une dictée."""
    title: str
    description: Optional[str]
    subject_title: Optional[str]   # Titre du sujet auquel la rattacher (ou None)
    subject_id: Optional[int]      # ID si sujet existant identifié
    priority: int                  # 0-3
    urgency_level: int             # 0-4
    deadline: Optional[str]        # YYYY-MM-DD ou None


@dataclass
class ExtractedSubject:
    """Sujet extrait par Claude depuis une dictée."""
    title: str
    description: Optional[str]
    priority: int       # 0-3
    is_new: bool        # False si Claude pense que c'est un sujet existant
    existing_id: Optional[int]  # ID du sujet existant si is_new=False


@dataclass
class ExtractionResult:
    """Résultat complet d'une extraction Claude."""
    subjects: List[ExtractedSubject]
    tasks: List[ExtractedTask]
    raw_response: str


class ClaudeService:
    """Interagit avec l'API Claude pour analyser les dictées utilisateur."""

    def __init__(self, user_api_key: str):
        """
        Initialise le client Claude avec la clé API de l'utilisateur.
        Chaque utilisateur utilise sa propre clé.
        """
        self._client = anthropic.Anthropic(api_key=user_api_key)

    def _build_extraction_prompt(self, user_input: str, existing_subjects: list) -> str:
        """Construit le prompt d'extraction envoyé à Claude."""
        existing_subjects_text = ""
        if existing_subjects:
            existing_subjects_text = "Sujets existants de l'utilisateur :\n"
            for subject in existing_subjects:
                existing_subjects_text += f'- ID {subject["id"]}: {subject["title"]}\n'
        else:
            existing_subjects_text = "L'utilisateur n'a pas encore de sujets enregistrés."

        return f"""Tu es un assistant d'organisation personnelle expert.
Analyse le texte suivant dicté par l'utilisateur et extrais les sujets (projets/thèmes) et actions (tâches concrètes) qu'il mentionne.

Texte dicté :
\"\"\"
{user_input}
\"\"\"

{existing_subjects_text}

Instructions :
- Un sujet est un thème ou projet regroupant des tâches (ex: "Projet maison", "Santé", "Travail").
- Une tâche est une action concrète à réaliser.
- Si une tâche correspond à un sujet existant, utilise son ID.
- Essaie de déduire la deadline et l'urgence depuis le texte (ex: "pour demain" = urgent avec deadline J+1).
- Si une information n'est pas mentionnée, mets null ou 0.

Niveaux de priorité : 0=aucune, 1=faible, 2=moyenne, 3=haute
Niveaux d'urgence : 0=aucune, 1=faible, 2=moyenne, 3=urgente, 4=critique
Format de date : YYYY-MM-DD

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après :
{{
  "subjects": [
    {{
      "title": "...",
      "description": "...",
      "priority": 0,
      "is_new": true,
      "existing_id": null
    }}
  ],
  "tasks": [
    {{
      "title": "...",
      "description": "...",
      "subject_title": "...",
      "subject_id": null,
      "priority": 0,
      "urgency_level": 0,
      "deadline": null
    }}
  ]
}}"""

    def extract_from_dictation(self, user_input: str, existing_subjects: list) -> ExtractionResult:
        """
        Envoie le texte dicté à Claude et retourne les sujets et tâches extraits.
        existing_subjects est une liste de dicts {"id": int, "title": str}.
        """
        prompt = self._build_extraction_prompt(user_input, existing_subjects)

        response = self._client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=config.CLAUDE_MAX_TOKENS,
            temperature=config.CLAUDE_TEMPERATURE,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_text = response.content[0].text.strip()

        # Extraction du bloc JSON (robustesse si Claude ajoute du texte)
        json_start = raw_text.find("{")
        json_end = raw_text.rfind("}") + 1
        json_text = raw_text[json_start:json_end] if json_start != -1 else raw_text

        data = json.loads(json_text)

        subjects = [
            ExtractedSubject(
                title=s.get("title", ""),
                description=s.get("description"),
                priority=s.get("priority", 0),
                is_new=s.get("is_new", True),
                existing_id=s.get("existing_id"),
            )
            for s in data.get("subjects", [])
        ]

        tasks = [
            ExtractedTask(
                title=t.get("title", ""),
                description=t.get("description"),
                subject_title=t.get("subject_title"),
                subject_id=t.get("subject_id"),
                priority=t.get("priority", 0),
                urgency_level=t.get("urgency_level", 0),
                deadline=t.get("deadline"),
            )
            for t in data.get("tasks", [])
        ]

        return ExtractionResult(subjects=subjects, tasks=tasks, raw_response=raw_text)
