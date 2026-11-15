"""
Tool definitions for ResponseOS.
Defines Groq/OpenAI function schemas for AI conversational tools
and specifies operator-only action contracts.
"""

# AI Tools available for the conversational agent during intake
AI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "update_incident_details",
            "description": "Record or update reported incident details based on the caller's statements. Call this whenever the caller provides information about what happened, category, hazards, injuries, or number of people affected.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Incident category, e.g., vehicle_collision, smoke_fire, medical_assistance, earthquake, missing_person, road_obstruction, or other",
                    },
                    "description": {
                        "type": "string",
                        "description": "Factual description of what the caller reported has occurred",
                    },
                    "reported_hazards": {
                        "type": "string",
                        "description": "Reported hazards (e.g. leaking fuel, active flames, downed power lines, smoke, unstable debris)",
                    },
                    "reported_injuries": {
                        "type": "string",
                        "description": "Reported injuries or medical conditions as described by caller",
                    },
                    "people_affected": {
                        "type": "integer",
                        "description": "Reported number of individuals involved, injured, or trapped. Omit if unknown.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "resolve_training_location",
            "description": "Resolve a reported San Francisco landmark or street name into verified geographic coordinates. Call this when the caller mentions where the incident is located.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_name": {
                        "type": "string",
                        "description": "The landmark, street, or area name mentioned by the caller (e.g. Ferry Building, Union Square, Golden Gate Bridge, Pier 39, Oracle Park, Mission Dolores Park)",
                    },
                },
                "required": ["location_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_missing_information",
            "description": "Inspect which essential incident fields have not yet been collected from the caller. Helps determine what to ask next.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_incident",
            "description": "Fetch the current structured incident data, status, and resolved location coordinates.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_reported_information",
            "description": "Retrieve all confirmed and reported facts collected so far across the conversation.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "prepare_operator_handoff",
            "description": "Mark the incident as ready for operator review and handoff. Call this when you have gathered location and key circumstances.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "string",
                        "description": "A concise, objective 2-3 sentence factual summary for the human dispatcher operator",
                    },
                },
                "required": ["summary"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_incident_summary",
            "description": "Generate or refresh the structured summary of the incident based on current reports.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "string",
                        "description": "Comprehensive summary of all known facts, reported injuries, hazards, and missing details",
                    },
                },
                "required": ["summary"],
            },
        },
    },
]

# Operator-only tools (Cannot be called by the AI agent; validated server-side)
OPERATOR_ONLY_TOOLS = {
    "review_incident",
    "correct_incident_details",
    "add_operator_note",
    "assign_training_unit",
    "release_training_unit",
    "update_incident_status",
    "close_incident",
    "export_incident_report",
}
