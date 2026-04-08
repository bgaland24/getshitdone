"""
Helpers pour construire des réponses JSON cohérentes dans toute l'API.
"""

from flask import jsonify


def success(data=None, status_code=200):
    """Réponse de succès avec données optionnelles."""
    body = {"success": True}
    if data is not None:
        body["data"] = data
    return jsonify(body), status_code


def error(message: str, status_code=400):
    """Réponse d'erreur avec message lisible."""
    return jsonify({"success": False, "error": message}), status_code
