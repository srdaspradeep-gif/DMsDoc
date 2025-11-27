import sys

# CRITICAL: Remove /usr/src from path before any imports
# pytest adds parent directories which causes 'app' package conflict
sys.path = [p for p in sys.path if p != '/usr/src']
