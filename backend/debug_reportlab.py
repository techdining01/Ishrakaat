import sys
import os

print("--- DEBUG SESSION ---")
print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")
print(f"CWD: {os.getcwd()}")
print("--- sys.path ---")
for p in sys.path:
    print(p)

print("--- reportlab check ---")
try:
    import reportlab
    print(f"Reportlab SUCCESS: {reportlab.__file__}")
    from reportlab.lib.pagesizes import A4
    print("Import A4 SUCCESS")
except ImportError as e:
    print(f"Import FAILED: {e}")
print("--- END DEBUG ---")
