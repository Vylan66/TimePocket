"""
Migration 002 — Add Friendship table for friend requests and relationships.

Run with:  flask migrate-db
"""
import sqlite3


def migrate(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='friendship'")
    if cur.fetchone():
        print("Migration 002: already applied, nothing to do.")
        conn.close()
        return

    cur.execute("""
        CREATE TABLE friendship (
            id           INTEGER PRIMARY KEY,
            requester_id INTEGER NOT NULL REFERENCES user(id),
            receiver_id  INTEGER NOT NULL REFERENCES user(id),
            status       TEXT    NOT NULL DEFAULT 'pending',
            created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            UNIQUE(requester_id, receiver_id)
        )
    """)
    conn.commit()
    conn.close()
    print("Migration 002: Friendship table created.")


if __name__ == '__main__':
    import os, sys
    db_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), '..', 'instance', 'timepocket.db'
    )
    migrate(os.path.abspath(db_path))
