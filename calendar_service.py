from datetime import datetime, timedelta
from typing import Dict, List, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import logging

# Logger setup
logger = logging.getLogger("calendar_service")
logger.setLevel(logging.INFO)

# Required env variables: CLIENT_ID, CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
CLIENT_ID = "your-google-client-id"
CLIENT_SECRET = "your-google-client-secret"
REDIRECT_URI = "your-google-redirect-uri"

def init_calendar_client(refresh_token: str):
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    service = build("calendar", "v3", credentials=creds)
    logger.info("✅ Google Calendar client initialized")
    return service

def create_event(service, calendar_id: str, event_data: Dict):
    try:
        event = service.events().insert(calendarId=calendar_id, body=event_data).execute()
        logger.info(f"📅 Event created: {event.get('id')}")
        return event
    except HttpError as e:
        logger.error(f"❌ Event creation failed: {e}")
        return None

def update_event(service, calendar_id: str, event_id: str, event_data: Dict):
    try:
        event = service.events().update(calendarId=calendar_id, eventId=event_id, body=event_data).execute()
        logger.info(f"♻️ Event updated: {event.get('id')}")
        return event
    except HttpError as e:
        logger.error(f"❌ Event update failed: {e}")
        return None

def delete_event(service, calendar_id: str, event_id: str):
    try:
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        logger.info(f"🗑️ Event deleted: {event_id}")
        return True
    except HttpError as e:
        logger.error(f"❌ Event deletion failed: {e}")
        return False

def get_events(service, calendar_id: str, start_date: str, end_date: str):
    try:
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=start_date,
            timeMax=end_date,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        events = events_result.get("items", [])
        logger.info(f"📥 Retrieved {len(events)} events.")
        return events
    except HttpError as e:
        logger.error(f"❌ Event fetch failed: {e}")
        return []
