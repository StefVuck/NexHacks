import os
import shutil
import sys

def check_env():
    # Check 1: API Key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("FAIL: ANTHROPIC_API_KEY is not set.")
    else:
        print(f"PASS: ANTHROPIC_API_KEY is set (starts with {api_key[:5]}...)")

    # Check 2: Compiler
    compiler = "arm-none-eabi-gcc"
    path = shutil.which(compiler)
    if not path:
        print(f"FAIL: {compiler} not found in PATH.")
    else:
        print(f"PASS: {compiler} found at {path}")

    # Check 3: QEMU
    qemu = "qemu-system-arm"
    path_qemu = shutil.which(qemu)
    if not path_qemu:
        print(f"FAIL: {qemu} not found in PATH.")
    else:
        print(f"PASS: {qemu} found at {path_qemu}")

if __name__ == "__main__":
    check_env()
