import requests

res = requests.post('http://127.0.0.1:5000/api/auth/login', json={"email": "admin@example.com", "password": "admin123"})
print(res.status_code)
print(res.json())
