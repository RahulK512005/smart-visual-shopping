"""
Smart Visual Shopping - Full Stack Runner
Starts:
1. Mock AI/ML Service (port 8001)
2. FastAPI Backend API (port 8000)
3. Next.js Frontend (port 3000)
"""
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"


def main():
    print("=" * 60)
    print("  Starting Smart Visual Shopping (Full Stack Integration)")
    print("=" * 60)

    # 1. Initialize DB and seed catalog
    print("\n[1/4] Ensuring database and product catalog are seeded...")
    try:
        from backend.app.db.init_db import init_db
        count = init_db()
        print(f"      Verified {count} products in catalog.")
    except Exception as e:
        print(f"      Note during DB seed: {e}")

    processes = []

    def cleanup(signum=None, frame=None):
        print("\nStopping all services...")
        for name, proc in reversed(processes):
            try:
                print(f"Stopping {name} (PID {proc.pid})...")
                proc.terminate()
            except Exception:
                pass
        for name, proc in processes:
            try:
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
        print("All services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    python_executable = sys.executable

    # 2. Start Mock AI/ML Service on 8001
    print("\n[2/4] Starting Mock AI/ML Service on http://127.0.0.1:8001 ...")
    ml_proc = subprocess.Popen(
        [python_executable, "-m", "uvicorn", "mock_ml_service:app", "--host", "127.0.0.1", "--port", "8001"],
        cwd=str(ROOT_DIR),
    )
    processes.append(("Mock ML Service", ml_proc))

    time.sleep(1)

    # 3. Start Backend on 8000
    print("[3/4] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(
        [python_executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(ROOT_DIR),
    )
    processes.append(("Backend API", backend_proc))

    time.sleep(1)

    # 4. Start Next.js Frontend on 3000
    print("[4/4] Starting Next.js Frontend on http://localhost:3000 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(FRONTEND_DIR),
    )
    processes.append(("Frontend Next.js", frontend_proc))

    print("\n" + "=" * 60)
    print("  All services running!")
    print("  - Frontend:   http://localhost:3000")
    print("  - Backend API: http://127.0.0.1:8000/docs")
    print("  - ML Service:  http://127.0.0.1:8001/internal/health")
    print("  Press Ctrl+C to terminate all services.")
    print("=" * 60 + "\n")

    try:
        while True:
            # Monitor processes
            for name, proc in processes:
                code = proc.poll()
                if code is not None:
                    print(f"\n[ALERT] {name} exited unexpectedly with code {code}.")
                    cleanup()
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()
