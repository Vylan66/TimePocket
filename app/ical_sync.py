import requests
from datetime import datetime, date, timedelta
from icalendar import Calendar
import recurring_ical_events


def fetch_and_parse(url, window_days=365):
    """Fetch an iCal URL and return a list of normalised event dicts."""
    # webcal:// is identical to https:// but requests doesn't support it
    url = url.replace('webcal://', 'https://', 1)
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Could not fetch calendar: {e}")

    try:
        cal = Calendar.from_ical(resp.content)
    except Exception as e:
        raise ValueError(f"Invalid iCal data: {e}")

    today = date.today()
    window_start = today - timedelta(days=30)
    window_end   = today + timedelta(days=window_days)

    try:
        instances = recurring_ical_events.of(cal).between(window_start, window_end)
    except Exception as e:
        raise ValueError(f"Could not expand calendar events: {e}")

    result = []
    for component in instances:
        if component.name != 'VEVENT':
            continue

        uid     = str(component.get('UID', ''))
        summary = str(component.get('SUMMARY', 'Imported Event')).strip()
        dtstart = component.get('DTSTART')
        dtend   = component.get('DTEND') or component.get('DTSTART')
        description = str(component.get('DESCRIPTION', '') or '').strip() or None

        if dtstart is None:
            continue

        dt_start = dtstart.dt
        dt_end   = dtend.dt

        if isinstance(dt_start, date) and not isinstance(dt_start, datetime):
            # All-day event — stored with sentinel so UI can render in the all-day strip
            event_date = dt_start.strftime('%Y-%m-%d')
            start_time = 'allday'
            end_time   = 'allday'
        else:
            # Strip timezone info, convert to local naive datetime
            if hasattr(dt_start, 'tzinfo') and dt_start.tzinfo:
                dt_start = dt_start.astimezone().replace(tzinfo=None)
            if hasattr(dt_end, 'tzinfo') and dt_end.tzinfo:
                dt_end = dt_end.astimezone().replace(tzinfo=None)

            event_date = dt_start.strftime('%Y-%m-%d')
            start_time = dt_start.strftime('%H:%M')
            end_time   = dt_end.strftime('%H:%M')

            # Clamp cross-midnight events
            if end_time <= start_time:
                end_time = '23:59'

        # Unique key per event instance (UID + date handles recurring expansions)
        instance_uid = f"{uid}_{event_date}"

        result.append({
            'uid':        instance_uid,
            'title':      summary[:100],
            'date':       event_date,
            'start_time': start_time,
            'end_time':   end_time,
            'notes':      description,
            'category':   'Personal',
        })

    return result


def sync_feed(feed_id):
    """
    Sync one ICalFeed by id. Upserts events by ical_uid, deletes removed ones.
    Returns (count, error_string_or_None).
    """
    from app.models import ICalFeed, Availability
    from app import db

    feed = ICalFeed.query.get(feed_id)
    if not feed or not feed.is_active:
        return 0, "Feed not found or inactive"

    try:
        parsed = fetch_and_parse(feed.url)
    except ValueError as e:
        return 0, str(e)

    parsed_map = {ev['uid']: ev for ev in parsed}

    existing = Availability.query.filter_by(
        user_id=feed.user_id,
        ical_feed_id=feed_id,
    ).all()
    existing_map = {slot.ical_uid: slot for slot in existing if slot.ical_uid}

    seen = set()
    for uid_key, ev in parsed_map.items():
        seen.add(uid_key)
        if uid_key in existing_map:
            slot = existing_map[uid_key]
            slot.title      = ev['title']
            slot.date       = ev['date']
            slot.start_time = ev['start_time']
            slot.end_time   = ev['end_time']
            slot.notes      = ev['notes']
        else:
            slot = Availability(
                user_id      = feed.user_id,
                ical_feed_id = feed_id,
                ical_uid     = uid_key,
                date         = ev['date'],
                start_time   = ev['start_time'],
                end_time     = ev['end_time'],
                title        = ev['title'],
                category     = ev['category'],
                notes        = ev['notes'],
                is_recurring = False,
            )
            db.session.add(slot)

    for uid_key, slot in existing_map.items():
        if uid_key not in seen:
            db.session.delete(slot)

    feed.last_synced = datetime.utcnow()
    db.session.commit()
    return len(parsed_map), None
