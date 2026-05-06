"""
Migration 001 — Replace Availability.day with Availability.date and add event detail columns.

Run with:  flask migrate-db
"""
import sqlite3
from datetime import datetime, timedelta


def get_week_sunday(ref: datetime) -> datetime:
    # Python weekday(): Mon=0, Sun=6.  Days since Sunday = (weekday + 1) % 7
    return ref - timedelta(days=(ref.weekday() + 1) % 7)


DAY_MAP = {
    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6,
}


def migrate(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    # Check whether we've already migrated
    cur.execute("PRAGMA table_info(availability)")
    cols = {row[1] for row in cur.fetchall()}
    if 'date' in cols and 'day' not in cols:
        print("Migration 001: already applied, nothing to do.")
        conn.close()
        return

    this_sunday = get_week_sunday(datetime.now())

    # Build new table
    cur.execute("""
        CREATE TABLE availability_new (
            id         INTEGER PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES user(id),
            date       TEXT    NOT NULL,
            start_time TEXT    NOT NULL,
            end_time   TEXT    NOT NULL,
            title      TEXT    NOT NULL DEFAULT '',
            category   TEXT,
            notes      TEXT
        )
    """)

    # Migrate existing rows, converting the old day column to a real date
    if 'day' in cols:
        cur.execute("SELECT id, user_id, day, start_time, end_time FROM availability")
        for row_id, user_id, day_val, start_time, end_time in cur.fetchall():
            try:
                day_idx = int(day_val)
            except (ValueError, TypeError):
                day_idx = DAY_MAP.get(str(day_val).lower(), 0)
            event_date = (this_sunday + timedelta(days=day_idx)).strftime('%Y-%m-%d')
            cur.execute(
                "INSERT INTO availability_new VALUES (?,?,?,?,?,?,?,?)",
                (row_id, user_id, event_date, start_time, end_time, '', None, None),
            )
    elif 'date' in cols:
        # Partial migration: copy as-is but add missing columns
        cur.execute("SELECT id, user_id, date, start_time, end_time FROM availability")
        for row in cur.fetchall():
            cur.execute(
                "INSERT INTO availability_new VALUES (?,?,?,?,?,?,?,?)",
                (*row, '', None, None),
            )

    cur.execute("DROP TABLE availability")
    cur.execute("ALTER TABLE availability_new RENAME TO availability")
    conn.commit()
    conn.close()
    print("Migration 001: complete — Availability table updated with date + event detail columns.")


if __name__ == '__main__':
    import os, sys
    # Allow running as: python migrations/001_add_event_details.py [db_path]
    db_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), '..', 'instance', 'timepocket.db'
    )
    migrate(os.path.abspath(db_path))
