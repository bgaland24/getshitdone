"""
Point d'entrée WSGI pour PythonAnywhere.
Dans le dashboard PythonAnywhere, pointer le fichier WSGI vers ce fichier
et définir la variable 'application'.
"""

import sys
import os

# Adapter ce chemin au répertoire réel sur PythonAnywhere
PROJECT_PATH = "/home/VOTRE_USERNAME/getshitdone"
if PROJECT_PATH not in sys.path:
    sys.path.insert(0, PROJECT_PATH)

from run import application
