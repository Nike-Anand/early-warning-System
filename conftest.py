"""
==============================================================================
SIH ID 26001: Pytest Configuration & Fixtures (conftest.py)
==============================================================================
Configures sys.path so `py -m pytest tests/` can find backend modules directly.
"""

import os
import sys

# Ensure the backend module directory is discoverable from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
