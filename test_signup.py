import requests

url = "http://127.0.0.1:5000/api/auth/signup"
data = {
    "name": "Test User",
    "email": "test2@example.com",
    "password": "password123",
    "confirm_password": "password123"
}
response = requests.post(url, json=data)
print(response.status_code)
print(response.text)
