from back_end.database.auth import hash_password

# Set your desired admin password
plain_password = "admin"

# Hash the password using your project's auth.py logic
hashed = hash_password(plain_password)

# Output the hashed password for DB insert
print("Use this hashed password in your DB insert:")
print(hashed)
