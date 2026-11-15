"""
San Francisco Training Landmark Catalog and Location Resolution Service.
Provides verified geographic coordinates for public landmarks in the SF training region.
"""

from typing import Optional, TypedDict


class LandmarkData(TypedDict):
    name: str
    latitude: float
    longitude: float
    address: str
    category: str


# Public verified coordinates for San Francisco landmarks
TRAINING_LANDMARKS: dict[str, LandmarkData] = {
    "golden gate bridge": {
        "name": "Golden Gate Bridge",
        "latitude": 37.8199,
        "longitude": -122.4783,
        "address": "Golden Gate Bridge, San Francisco, CA 94129",
        "category": "bridge",
    },
    "union square": {
        "name": "Union Square",
        "latitude": 37.7879,
        "longitude": -122.4075,
        "address": "333 Post St, San Francisco, CA 94108",
        "category": "plaza",
    },
    "ferry building": {
        "name": "Ferry Building",
        "latitude": 37.7955,
        "longitude": -122.3934,
        "address": "1 Ferry Building, San Francisco, CA 94111",
        "category": "transit",
    },
    "oracle park": {
        "name": "Oracle Park",
        "latitude": 37.7786,
        "longitude": -122.3893,
        "address": "24 Willie Mays Plaza, San Francisco, CA 94107",
        "category": "stadium",
    },
    "mission dolores park": {
        "name": "Mission Dolores Park",
        "latitude": 37.7596,
        "longitude": -122.4269,
        "address": "Dolores St & 19th St, San Francisco, CA 94114",
        "category": "park",
    },
    "dolores park": {
        "name": "Mission Dolores Park",
        "latitude": 37.7596,
        "longitude": -122.4269,
        "address": "Dolores St & 19th St, San Francisco, CA 94114",
        "category": "park",
    },
    "san francisco city hall": {
        "name": "San Francisco City Hall",
        "latitude": 37.7793,
        "longitude": -122.4193,
        "address": "1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102",
        "category": "civic",
    },
    "city hall": {
        "name": "San Francisco City Hall",
        "latitude": 37.7793,
        "longitude": -122.4193,
        "address": "1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102",
        "category": "civic",
    },
    "pier 39": {
        "name": "Pier 39",
        "latitude": 37.8087,
        "longitude": -122.4098,
        "address": "The Embarcadero, San Francisco, CA 94133",
        "category": "pier",
    },
    "fishermans wharf": {
        "name": "Fisherman's Wharf",
        "latitude": 37.8080,
        "longitude": -122.4177,
        "address": "Jefferson St, San Francisco, CA 94133",
        "category": "harbor",
    },
    "lombard street": {
        "name": "Lombard Street",
        "latitude": 37.8021,
        "longitude": -122.4187,
        "address": "Lombard St (Crooked Section), San Francisco, CA 94133",
        "category": "street",
    },
    "coit tower": {
        "name": "Coit Tower",
        "latitude": 37.8024,
        "longitude": -122.4058,
        "address": "1 Telegraph Hill Blvd, San Francisco, CA 94133",
        "category": "monument",
    },
    "palace of fine arts": {
        "name": "Palace of Fine Arts",
        "latitude": 37.8028,
        "longitude": -122.4482,
        "address": "3301 Lyon St, San Francisco, CA 94123",
        "category": "civic",
    },
    "twin peaks": {
        "name": "Twin Peaks",
        "latitude": 37.7544,
        "longitude": -122.4477,
        "address": "501 Twin Peaks Blvd, San Francisco, CA 94114",
        "category": "viewpoint",
    },
    "alcatraz": {
        "name": "Alcatraz Island",
        "latitude": 37.8267,
        "longitude": -122.4230,
        "address": "Alcatraz Island, San Francisco, CA 94133",
        "category": "landmark",
    },
    "chinateown": {
        "name": "San Francisco Chinatown",
        "latitude": 37.7941,
        "longitude": -122.4078,
        "address": "Grant Ave & Bush St, San Francisco, CA 94108",
        "category": "district",
    },
    "chinatown": {
        "name": "San Francisco Chinatown",
        "latitude": 37.7941,
        "longitude": -122.4078,
        "address": "Grant Ave & Bush St, San Francisco, CA 94108",
        "category": "district",
    },
}


def resolve_location(query: str) -> Optional[LandmarkData]:
    """
    Resolve a user query to a known San Francisco landmark.
    Uses exact key match, substring match, and word overlap.
    Returns None if no matching landmark is found.
    """
    if not query or not isinstance(query, str):
        return None

    cleaned = query.lower().strip()
    if not cleaned:
        return None

    # Remove common filler words
    for prefix in ["near the ", "near ", "at the ", "at ", "by the ", "by ", "around "]:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()

    if not cleaned:
        return None

    # 1. Exact match in keys
    if cleaned in TRAINING_LANDMARKS:
        return TRAINING_LANDMARKS[cleaned]

    # 2. Check if query is in landmark display name or vice versa (minimum length 4)
    if len(cleaned) >= 4:
        for key, data in TRAINING_LANDMARKS.items():
            name_lower = data["name"].lower()
            if cleaned == name_lower:
                return data
            # Only match if key is significant substring
            if len(key) >= 5 and key in cleaned:
                return data
            if len(name_lower) >= 5 and name_lower in cleaned:
                return data

    # 3. Token overlap match (requires at least 2 tokens or full landmark token match)
    query_tokens = set(cleaned.replace(",", " ").replace("-", " ").split())
    # Exclude common stop words
    query_tokens -= {"the", "of", "and", "in", "san", "francisco", "ca", "california", "st", "street", "city", "park"}

    if not query_tokens:
        return None

    best_match: Optional[LandmarkData] = None
    best_overlap = 0

    for key, data in TRAINING_LANDMARKS.items():
        key_tokens = set(key.split()) - {"san", "francisco", "park"}
        overlap = len(query_tokens & key_tokens)
        if overlap > best_overlap and overlap >= len(key_tokens):
            best_overlap = overlap
            best_match = data

    if best_overlap >= 1 and best_match is not None:
        return best_match

    return None


def get_all_landmarks() -> list[LandmarkData]:
    """Return all unique landmarks in the catalog."""
    seen_names = set()
    result = []
    for data in TRAINING_LANDMARKS.values():
        if data["name"] not in seen_names:
            seen_names.add(data["name"])
            result.append(data)
    return result
