import requests

url = "http://127.0.0.1:8000/monitoramento"
dados = {
    "machine_id": "Hhhhznd_test",
    "download_speed": 54.0,
    "upload_speed": 21.6,
    "status": "ONLINE",
    "ip": "192.168.2.195",
    "codigo_organizacao": "ADMIN123" # using a fake one, or need real? Let's check without org
}
r = requests.post(url, json=dados)
print("Response:", r.status_code, r.json())

# Now let's get the DB machines
r2 = requests.get("http://127.0.0.1:8000/maquinas")
print("\nMaquinas:", r2.json())
