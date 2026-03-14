import socket
import asyncio
import asyncpg

regions = [
    "ap-south-1", "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "ap-northeast-1", "ap-northeast-2", "ap-northeast-3", "ap-southeast-1", "ap-southeast-2",
    "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
    "sa-east-1"
]

async def check():
    for region in regions:
        host = f"aws-0-{region}.pooler.supabase.com"
        print(f"Testing {host}...")
        try:
            # Try DNS resolution first to speed up failing ones
            try:
                socket.gethostbyname(host)
            except socket.gaierror:
                continue

            # Then try connecting
            conn = await asyncpg.connect(
                user="postgres.sppisoyojtlkfddgvoio",
                password="tapupatel2809",
                database="postgres",
                host=host,
                port=6543,
                timeout=5
            )
            print(f"\\nSUCCESS! Found the correct pooler URL.")
            print(f"postgresql+asyncpg://postgres.sppisoyojtlkfddgvoio:tapupatel2809@{host}:6543/postgres")
            await conn.close()
            return host
        except Exception as e:
            pass

    print("Could not find a working pooler connection.")

asyncio.run(check())
