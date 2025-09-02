#!/usr/bin/env python3

import os
import json
from datetime import datetime, timedelta

# Mock classes for testing without database
class MockConnection:
    def __init__(self, mock_data):
        self.mock_data = mock_data
    
    def cursor(self, **kwargs):
        return MockCursor(self.mock_data)

class MockCursor:
    def __init__(self, mock_data):
        self.mock_data = mock_data
        self.current_query = None
        self.query_params = None
    
    def execute(self, query, params=None):
        self.current_query = query.lower()
        self.query_params = params
    
    def fetchall(self):
        # Return different mock data based on query
        if "from staff" in self.current_query:
            return self.mock_data.get("staff", [])
        elif "from staff_schedules" in self.current_query:
            return self.mock_data.get("schedules", [])
        elif "from appointments" in self.current_query:
            return self.mock_data.get("appointments", [])
        elif "from services" in self.current_query:
            return self.mock_data.get("services", [])
        elif "from service_categories" in self.current_query:
            return self.mock_data.get("categories", [])
        return []
    
    def fetchone(self):
        if "from services where name" in self.current_query:
            return {"id": 1}
        return None

# Mock RealTimeDataConnector with sample data
class MockRealTimeDataConnector:
    def __init__(self):
        # Create sample data
        self.mock_data = {
            "staff": [
                {"id": 1, "name": "Sarah Johnson", "title": "Master Stylist"},
                {"id": 2, "name": "Michael Chen", "title": "Esthetician"},
                {"id": 3, "name": "Emma Rodriguez", "title": "Nail Technician"}
            ],
            "categories": [
                {"id": 1, "name": "Hair"},
                {"id": 2, "name": "Skin"},
                {"id": 3, "name": "Nails"}
            ],
            "services": [
                {"id": 1, "name": "Women's Haircut", "description": "Includes consultation, shampoo, cut and style", "price": "$65", "duration": 60, "category_id": 1},
                {"id": 2, "name": "Men's Haircut", "description": "Includes consultation, shampoo, cut and style", "price": "$45", "duration": 30, "category_id": 1},
                {"id": 3, "name": "Express Facial", "description": "Quick facial treatment for on-the-go clients", "price": "$45", "duration": 30, "category_id": 2},
                {"id": 4, "name": "Signature Facial", "description": "Customized facial treatment for all skin types", "price": "$85", "duration": 60, "category_id": 2},
                {"id": 5, "name": "Manicure", "description": "Nail shaping, cuticle care, hand massage, and polish", "price": "$30", "duration": 30, "category_id": 3}
            ],
            "schedules": [],  # Will be populated dynamically
            "appointments": []  # Will be populated dynamically
        }
        
        # Create mock staff schedules for the next 7 days
        today = datetime.now().date()
        for staff_id in [1, 2, 3]:
            for day in range(7):
                if day % 2 == 0:  # Staff works every other day
                    day_date = today + timedelta(days=day)
                    start_time = datetime.combine(day_date, datetime.min.time().replace(hour=9))
                    end_time = datetime.combine(day_date, datetime.min.time().replace(hour=17))
                    self.mock_data["schedules"].append({
                        "staff_id": staff_id,
                        "start_time": start_time,
                        "end_time": end_time
                    })
        
        # Create some mock appointments
        appt_date = today + timedelta(days=1)
        self.mock_data["appointments"].append({
            "date": datetime.combine(appt_date, datetime.min.time().replace(hour=10)),
            "duration": 60,
            "service": "Women's Haircut",
            "staff_id": 1
        })
        self.mock_data["appointments"].append({
            "date": datetime.combine(appt_date, datetime.min.time().replace(hour=14)),
            "duration": 30,
            "service": "Manicure",
            "staff_id": 3
        })
    
    def _get_connection(self):
        return MockConnection(self.mock_data)
    
    def get_services_with_details(self):
        result = {}
        for category in self.mock_data["categories"]:
            category_name = category["name"]
            result[category_name] = []
            for service in self.mock_data["services"]:
                if service["category_id"] == category["id"]:
                    result[category_name].append(service)
        return result
    
    def get_available_slots(self, date_range_days=7):
        result = {}
        today = datetime.now().date()
        
        # Check each day in the date range
        for day_offset in range(date_range_days):
            check_date = today + timedelta(days=day_offset)
            date_str = check_date.strftime("%Y-%m-%d")
            
            # Generate slots from 9 AM to 5 PM every 30 minutes
            slots = []
            for hour in range(9, 17):
                for minute in [0, 30]:
                    time_obj = datetime.combine(check_date, datetime.min.time().replace(hour=hour, minute=minute))
                    
                    # Check if slot conflicts with any booked appointment
                    is_available = True
                    for appt in self.mock_data["appointments"]:
                        appt_start = appt["date"]
                        appt_end = appt_start + timedelta(minutes=appt["duration"])
                        
                        # Check for overlap
                        slot_end = time_obj + timedelta(minutes=30)
                        if (time_obj < appt_end and slot_end > appt_start and 
                            appt_start.date() == check_date):
                            is_available = False
                            break
                    
                    if is_available:
                        slots.append({
                            "time": f"{hour:02d}:{minute:02d}",
                            "formatted_time": time_obj.strftime("%-I:%M %p"),
                            "duration": 30
                        })
            
            result[date_str] = slots
        
        return result
    
    def get_staff_availability(self, date_range_days=7):
        result = {}
        today = datetime.now().date()
        
        for staff in self.mock_data["staff"]:
            staff_id = staff["id"]
            staff_name = staff["name"]
            result[staff_name] = {}
            
            # Check each day in the date range
            for day_offset in range(date_range_days):
                check_date = today + timedelta(days=day_offset)
                date_str = check_date.strftime("%Y-%m-%d")
                
                # Check if staff is scheduled this day
                is_scheduled = False
                for schedule in self.mock_data["schedules"]:
                    if (schedule["staff_id"] == staff_id and 
                        schedule["start_time"].date() == check_date):
                        is_scheduled = True
                        break
                
                if not is_scheduled:
                    result[staff_name][date_str] = []
                    continue
                
                # Get all possible slots for this day
                slots = []
                for hour in range(9, 17):
                    for minute in [0, 30]:
                        time_obj = datetime.combine(check_date, datetime.min.time().replace(hour=hour, minute=minute))
                        
                        # Check if slot conflicts with any booked appointment
                        is_available = True
                        for appt in self.mock_data["appointments"]:
                            if appt["staff_id"] != staff_id:
                                continue
                                
                            appt_start = appt["date"]
                            appt_end = appt_start + timedelta(minutes=appt["duration"])
                            
                            # Check for overlap
                            slot_end = time_obj + timedelta(minutes=30)
                            if (time_obj < appt_end and slot_end > appt_start and 
                                appt_start.date() == check_date):
                                is_available = False
                                break
                        
                        if is_available:
                            slots.append({
                                "time": f"{hour:02d}:{minute:02d}",
                                "formatted_time": time_obj.strftime("%-I:%M %p"),
                                "duration": 30
                            })
                
                result[staff_name][date_str] = slots
        
        return result

# Import and modify BusinessKnowledge to use the mock connector
from business_knowledge import BusinessKnowledge

# Test the integration
if __name__ == "__main__":
    print("\n=== Testing Real-Time Integration ===\n")
    
    # Create a mock BusinessKnowledge instance
    business_knowledge = BusinessKnowledge()
    
    # Replace the real connector with our mock
    business_knowledge.real_time_connector = MockRealTimeDataConnector()
    
    # Generate the LLM prompt with real-time data
    knowledge_str = business_knowledge.get_knowledge_for_llm()
    
    print("=== Generated Knowledge for LLM ===\n")
    print(knowledge_str)
    
    print("\n=== Test Questions and Responses ===\n")
    
    # Simulate some user questions and how they would be answered
    questions = [
        "What services do you offer?",
        "When is Sarah Johnson available?",
        "Do you have any openings tomorrow morning?",
        "How much is a facial?",
        "What times are available next Tuesday?"
    ]
    
    # Generate pretend answers that would use the knowledge
    for q in questions:
        print(f"Q: {q}")
        
        # Generate a simple mock response based on the question
        if "services" in q.lower():
            print("A: We offer a variety of services including Women's Haircut ($65), Men's Haircut ($45), Express Facial ($45), Signature Facial ($85), and Manicure ($30).")
        elif "sarah" in q.lower() and "available" in q.lower():
            print("A: Sarah Johnson is available tomorrow morning and afternoon, and also has availability on Thursday.")
        elif "openings tomorrow" in q.lower():
            print("A: Yes, we have several openings tomorrow morning at 9:00 AM, 9:30 AM, 11:00 AM, and 11:30 AM.")
        elif "facial" in q.lower():
            print("A: We offer two types of facials: an Express Facial for $45 (30 minutes) and a Signature Facial for $85 (60 minutes).")
        elif "next tuesday" in q.lower():
            print("A: For next Tuesday, we have appointments available in the morning at 9:00 AM and 11:30 AM, and in the afternoon at 2:00 PM and 3:30 PM.")
        
        print("")
    
    print("=== Test Completed ===\n")
    print("This integration allows the LLM to access real-time data about:")
    print("1. Current service offerings and pricing")
    print("2. Staff availability and scheduling")
    print("3. Open appointment slots")
    print("4. Specialized staff for specific services\n")
    print("This makes the SMS responses more accurate and helpful to clients.")
