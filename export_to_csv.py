import sqlite3
import csv
import sys

DB_FILE = 'tempstick_data.db'

EXPORT_FILE = sys.argv[1] if len(sys.argv) > 1 else None

conn = sqlite3.connect(DB_FILE)
c = conn.cursor()
c.execute('SELECT * FROM readings')
rows = c.fetchall()
col_names = [description[0] for description in c.description]

if EXPORT_FILE:
    with open(EXPORT_FILE, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(col_names)
        writer.writerows(rows)
    print(f"Exported to {EXPORT_FILE}")
else:
    writer = csv.writer(sys.stdout)
    writer.writerow(col_names)
    writer.writerows(rows)

conn.close() 