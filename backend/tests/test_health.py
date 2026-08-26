import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.config import settings

class TestHealthEndpoints(unittest.TestCase):
    def test_app_created(self):
        self.assertIsNotNone(app)
        self.assertEqual(app.title, settings.PROJECT_NAME)

    def test_settings_loaded(self):
        self.assertEqual(settings.API_V1_STR, "/api")
        self.assertIn("*", settings.CORS_ORIGINS)

if __name__ == "__main__":
    unittest.main()
