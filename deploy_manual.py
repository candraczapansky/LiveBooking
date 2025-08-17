#!/usr/bin/env python3
"""
Manual deployment script for the payment server
Run this if the Replit "Run" button isn't working
"""
import os
import sys
import subprocess
import time

def main():
    print("🚀 Manual Payment Server Deployment")
    print("=" * 50)
    
    # Check if we're in Replit
    if os.path.exists("/home/runner"):
        print("✅ Running in Replit environment")
    else:
        print("⚠️  Not running in Replit environment")
    
    # Check environment variables
    port = os.environ.get("PORT", "8000")
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"🌐 Server will run on {host}:{port}")
    
    # Check if port is available
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', int(port)))
        sock.close()
        
        if result == 0:
            print(f"❌ Port {port} is already in use")
            print("💡 Try stopping other servers first")
            return False
        else:
            print(f"✅ Port {port} is available")
    except Exception as e:
        print(f"⚠️  Could not check port availability: {e}")
    
    # Check dependencies
    print("\n📦 Checking dependencies...")
    try:
        import fastapi
        print(f"✅ FastAPI {fastapi.__version__}")
    except ImportError:
        print("❌ FastAPI not found")
        return False
    
    try:
        import uvicorn
        print(f"✅ Uvicorn {uvicorn.__version__}")
    except ImportError:
        print("❌ Uvicorn not found")
        return False
    
    # Test server import
    print("\n🧪 Testing server...")
    try:
        from main import app
        print("✅ Server imports successfully")
    except Exception as e:
        print(f"❌ Server import failed: {e}")
        return False
    
    # Start the server
    print(f"\n🚀 Starting server on {host}:{port}...")
    print("💡 Press Ctrl+C to stop the server")
    print("🌐 Your server will be available at:")
    print(f"   http://localhost:{port}")
    
    if os.path.exists("/home/runner"):
        print("🔗 In Replit, you can also access it via the webview")
    
    print("\n" + "=" * 50)
    
    # Start the server
    try:
        import uvicorn
        uvicorn.run(app, host=host, port=int(port))
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server failed to start: {e}")
        return False
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n🛑 Deployment cancelled")
        sys.exit(1)
