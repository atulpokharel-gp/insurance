#!/usr/bin/env python3
"""
Test script to verify Gautam Insurance website installation
"""

import sys
import os
import importlib

def test_imports():
    """Test if all required packages can be imported"""
    print("Testing package imports...")
    
    # (module import name, pip install name)
    required_packages = [
        ('fastapi', 'fastapi'),
        ('uvicorn', 'uvicorn[standard]'),
        ('sqlalchemy', 'sqlalchemy'),
        ('pydantic', 'pydantic'),
        ('passlib', 'passlib[bcrypt]'),
        ('bcrypt', 'bcrypt==3.2.2'),
        ('jose', 'python-jose[cryptography]'),
        ('jinja2', 'jinja2')
    ]

    missing_packages = []
    legacy_jose_detected = False
    
    for module_name, install_name in required_packages:
        try:
            module = importlib.import_module(module_name)
            if module_name == 'jose':
                module_file = (getattr(module, '__file__', '') or '').lower()
                has_jwt_error = hasattr(module, 'JWTError')
                # The legacy "jose" package installs a single jose.py file and
                # is not compatible with this project (Python 3 print syntax).
                if module_file.endswith('jose.py') or not has_jwt_error:
                    raise ImportError("Incompatible 'jose' package detected; install python-jose[cryptography]")
            print(f"✓ {module_name}")
        except ImportError as exc:
            if module_name == 'jose':
                legacy_jose_detected = True
            reason = f" - {exc}" if str(exc) else " - MISSING"
            print(f"✗ {module_name}{reason}")
            missing_packages.append(install_name)
    
    return missing_packages, legacy_jose_detected

def test_database():
    """Test database connection"""
    print("\nTesting database...")
    try:
        # Add backend to path
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from database import engine
        from models import Base
        
        # Test connection
        connection = engine.connect()
        connection.close()
        print("✓ Database connection successful")
        return True
    except Exception as e:
        print(f"✗ Database error: {e}")
        return False

def test_models():
    """Test model creation"""
    print("\nTesting database models...")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from database import engine
        from models import Base
        
        # Create tables
        Base.metadata.create_all(bind=engine)
        print("✓ Database models created successfully")
        return True
    except Exception as e:
        print(f"✗ Model creation error: {e}")
        return False

def test_password_hashing():
    """Test passlib/bcrypt hashing to catch incompatible bcrypt versions"""
    print("\nTesting password hashing (passlib/bcrypt)...")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from auth import get_password_hash
        hashed = get_password_hash("admin123")
        if not hashed:
            raise ValueError("Hashing returned empty result")
        print("✓ Password hashing works")
        return True
    except Exception as e:
        print(f"✗ Password hashing error: {e}")
        print("  Try reinstalling bcrypt with:")
        print("  pip uninstall -y bcrypt && pip install bcrypt==3.2.2")
        return False

def main():
    print("Gautam Insurance Website - Installation Test")
    print("=" * 50)
    
    # Test imports
    missing, legacy_jose = test_imports()
    
    if missing:
        print(f"\nMissing packages: {', '.join(missing)}")
        print("Please install missing packages using:")
        print(f"pip install {' '.join(missing)}")
    if legacy_jose:
        print("\nDetected the legacy 'jose' package.")
        print("Please run:")
        print("  pip uninstall jose")
        print("  pip install python-jose[cryptography]")
        print("The project requires python-jose (not the older 'jose' package).")
    
    if missing or legacy_jose:
        return False
    
    # Test password hashing
    hashing_ok = test_password_hashing()
    if not hashing_ok:
        return False
    
    # Test database
    db_ok = test_database()
    
    # Test models
    models_ok = test_models()
    
    print("\n" + "=" * 50)
    if missing or legacy_jose or not hashing_ok or not db_ok or not models_ok:
        print("❌ Installation test FAILED")
        return False
    else:
        print("✅ Installation test PASSED")
        print("\nYou can now run the website using:")
        print("  ./run.sh  (Linux/Mac)")
        print("or")
        print("  cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
