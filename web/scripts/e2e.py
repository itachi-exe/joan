"""Compatibility entrypoint. The current suite exercises the real persisted API."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('integration.py')), run_name='__main__')
