"""
Database initialization script for DocFlow.
Creates test user if not exists.
Run this after docker compose up.
"""
import asyncio
import httpx
import sys

API_BASE = "http://localhost:8000/v2"

async def create_admin_user():
    """Create admin user if not exists"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        user_data = {
            "email": "admin@docflow.com",
            "username": "admin",
            "password": "admin123"
        }
        
        try:
            response = await client.post(f"{API_BASE}/u/signup", json=user_data)
            if response.status_code == 201:
                print("[OK] Created admin user: admin@docflow.com / admin123")
                return True
            elif "already exists" in response.text.lower():
                print("[OK] Admin user already exists")
                return True
            else:
                print(f"[INFO] Response: {response.text}")
                return True
        except httpx.ConnectError:
            print("[ERROR] Cannot connect to API. Make sure docker compose is running.")
            return False
        except Exception as e:
            print(f"[ERROR] {e}")
            return False

async def main():
    print("=" * 50)
    print("DocFlow Database Initialization")
    print("=" * 50)
    
    # Wait for API to be ready
    print("\nChecking API health...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(10):
            try:
                response = await client.get("http://localhost:8000/health")
                if response.status_code == 200:
                    print("[OK] API is healthy")
                    break
            except:
                print(f"Waiting for API... ({i+1}/10)")
                await asyncio.sleep(3)
        else:
            print("[ERROR] API not responding after 30 seconds")
            sys.exit(1)
    
    # Create admin user
    print("\nCreating admin user...")
    await create_admin_user()
    
    print("\n" + "=" * 50)
    print("Initialization complete!")
    print("=" * 50)
    print("\nYou can now login at http://localhost:3000 with:")
    print("  Email: admin@docflow.com")
    print("  Password: admin123")

if __name__ == "__main__":
    asyncio.run(main())
