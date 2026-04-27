import sqlite3
import json

conn = sqlite3.connect('tiresolve.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT id, nome, download_speed, upload_speed, organizacao_id, ultima_verificacao FROM maquinas WHERE nome = 'Hhhhznd';")
rows = [dict(row) for row in cursor.fetchall()]
print(json.dumps(rows, indent=2))
