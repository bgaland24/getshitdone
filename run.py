"""
Point d'entrée de l'application.
Utilisé en développement local et sur PythonAnywhere (wsgi.py pointe ici).
"""

from app import create_app

application = create_app()

if __name__ == "__main__":
    application.run(debug=True)
