"""
Point d'entrée pour le développement local.
Lancer avec : python run.py
"""

from app import create_app

if __name__ == "__main__":
    app = create_app("development")
    app.run(debug=True, port=5000)
