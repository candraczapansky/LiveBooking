import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from models import ClientInfo, AppointmentInfo

class ConversationState:
    """Represents the state of a conversation"""
    
    def __init__(self, phone_number: str):
        self.phone_number = phone_number
        self.step = "greeting"  # greeting, service_selection, time_selection, client_info, confirmation
        self.selected_service = None
        self.selected_date = None
        self.selected_time = None
        self.client_info = None
        self.temp_data = {}
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for storage"""
        return {
            "phone_number": self.phone_number,
            "step": self.step,
            "selected_service": self.selected_service,
            "selected_date": self.selected_date,
            "selected_time": self.selected_time,
            "client_info": self.client_info.dict() if self.client_info else None,
            "temp_data": self.temp_data,
            "created_at": self.created_at.isoformat(),
            "last_activity": self.last_activity.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationState':
        """Create state from dictionary"""
        state = cls(data["phone_number"])
        state.step = data["step"]
        state.selected_service = data["selected_service"]
        state.selected_date = data["selected_date"]
        state.selected_time = data["selected_time"]
        state.temp_data = data.get("temp_data", {})
        state.created_at = datetime.fromisoformat(data["created_at"])
        state.last_activity = datetime.fromisoformat(data["last_activity"])
        
        if data.get("client_info"):
            state.client_info = ClientInfo(**data["client_info"])
        
        return state

class ConversationManager:
    """Manages conversation state and flow for appointment booking"""
    
    def __init__(self, db_service=None):
        self.conversations: Dict[str, ConversationState] = {}
        self.logger = logging.getLogger(__name__)
        self.db_service = db_service
        
        # Available services
        self.services = {
            "haircut": {"name": "Haircut", "duration": 60, "price": "$45"},
            "haircut_and_style": {"name": "Haircut & Style", "duration": 90, "price": "$65"},
            "color": {"name": "Hair Color", "duration": 120, "price": "$85"},
            "highlights": {"name": "Highlights", "duration": 150, "price": "$95"},
            "balayage": {"name": "Balayage", "duration": 180, "price": "$120"},
            "blowout": {"name": "Blowout", "duration": 45, "price": "$35"},
            "updo": {"name": "Updo", "duration": 60, "price": "$55"},
            "extensions": {"name": "Hair Extensions", "duration": 120, "price": "$150"}
        }
    
    def get_conversation(self, phone_number: str) -> ConversationState:
        """Get or create conversation state for a phone number"""
        if phone_number not in self.conversations:
            self.conversations[phone_number] = ConversationState(phone_number)
        else:
            # Update last activity
            self.conversations[phone_number].last_activity = datetime.now()
        
        return self.conversations[phone_number]
    
    def update_conversation(self, phone_number: str, **kwargs) -> ConversationState:
        """Update conversation state"""
        state = self.get_conversation(phone_number)
        for key, value in kwargs.items():
            if hasattr(state, key):
                setattr(state, key, value)
        state.last_activity = datetime.now()
        return state
    
    def process_message(self, phone_number: str, message: str, client_info: Optional[ClientInfo] = None) -> Dict[str, Any]:
        """
        Process incoming message and return appropriate response
        """
        state = self.get_conversation(phone_number)
        
        # Update client info if provided
        if client_info:
            state.client_info = client_info
        
        # Log current state for debugging
        self.logger.info(f"Processing message for {phone_number}: '{message}' at step '{state.step}'")
        
        # Check if this is a booking-related message
        message_lower = message.lower()
        is_booking_request = any(word in message_lower for word in [
            "book", "appointment", "schedule", "make appointment", "book me",
            "haircut", "color", "style", "service", "price", "cost"
        ])
        
        # If we're in a booking flow or this is a booking request, handle it
        if state.step != "greeting" or is_booking_request:
            # Process based on current step
            if state.step == "greeting":
                result = self._handle_greeting(state, message)
            elif state.step == "service_selection":
                result = self._handle_service_selection(state, message)
            elif state.step == "time_selection":
                result = self._handle_time_selection(state, message)
            elif state.step == "client_info":
                result = self._handle_client_info(state, message)
            elif state.step == "confirmation":
                result = self._handle_confirmation(state, message)
            else:
                result = self._handle_greeting(state, message)
            
            # Log result for debugging
            self.logger.info(f"Conversation result for {phone_number}: {result}")
            
            # If we have a specific response, use it
            if result.get("response"):
                return result
            else:
                # Fall back to AI for general conversation
                return {
                    "response": None,
                    "requires_booking": False,
                    "step": state.step
                }
        else:
            # For general conversation, always let AI handle it
            self.logger.info(f"General conversation for {phone_number}, letting AI handle it")
            return {
                "response": None,
                "requires_booking": False,
                "step": "greeting"
            }
    
    def _handle_greeting(self, state: ConversationState, message: str) -> Dict[str, Any]:
        """Handle initial greeting and service selection"""
        message_lower = message.lower()
        
        # Check if user wants to book an appointment (more specific)
        if any(word in message_lower for word in ["book", "appointment", "schedule", "make appointment", "book me"]):
            state.step = "service_selection"
            return {
                "response": "Great! I'd be happy to help you book an appointment. Here are our services:\n\n" + 
                           self._format_services() + 
                           "\n\nPlease reply with the service you'd like to book.",
                "step": "service_selection",
                "requires_booking": True
            }
        elif any(word in message_lower for word in ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]):
            # For greetings, let AI handle the response to make it more natural
            return {
                "response": None,
                "step": "greeting",
                "requires_booking": False
            }
        else:
            # For general conversation, let AI handle it
            return {
                "response": None,
                "step": "greeting",
                "requires_booking": False
            }
    
    def _handle_service_selection(self, state: ConversationState, message: str) -> Dict[str, Any]:
        """Handle service selection"""
        message_lower = message.lower()
        
        # Map user input to service
        service_mapping = {
            "haircut": "haircut",
            "cut": "haircut",
            "hair cut": "haircut",
            "style": "haircut_and_style",
            "haircut and style": "haircut_and_style",
            "color": "color",
            "hair color": "color",
            "dye": "color",
            "highlights": "highlights",
            "highlight": "highlights",
            "balayage": "balayage",
            "blowout": "blowout",
            "blow out": "blowout",
            "updo": "updo",
            "up do": "updo",
            "up-do": "updo",
            "extensions": "extensions",
            "extension": "extensions"
        }
        
        selected_service = None
        for key, service in service_mapping.items():
            if key in message_lower:
                selected_service = service
                break
        
        if selected_service:
            state.selected_service = selected_service
            state.step = "time_selection"
            
            service_info = self.services[selected_service]
            return {
                "response": f"Perfect! You've selected {service_info['name']} ({service_info['price']}).\n\n" +
                           "What day would you like to book? You can say:\n" +
                           "• Tomorrow\n" +
                           "• Next Tuesday\n" +
                           "• March 15th\n" +
                           "• Or any specific date",
                "step": "time_selection",
                "selected_service": selected_service,
                "requires_booking": True
            }
        else:
            return {
                "response": "I didn't recognize that service. Here are our available services:\n\n" +
                           self._format_services() +
                           "\n\nPlease reply with the service you'd like to book.",
                "step": "service_selection",
                "requires_booking": True
            }
    
    def _handle_time_selection(self, state: ConversationState, message: str) -> Dict[str, Any]:
        """Handle date and time selection"""
        # This would integrate with the database service to get available times
        # For now, we'll simulate available times
        state.selected_date = "tomorrow"  # This would be parsed from message
        state.selected_time = "2:00 PM"   # This would be selected from available times
        
        state.step = "client_info"
        
        return {
            "response": f"Great! I have {state.selected_time} available on {state.selected_date}.\n\n" +
                       "To complete your booking, I need a few details:\n\n" +
                       "What's your name?",
            "step": "client_info",
            "selected_date": state.selected_date,
            "selected_time": state.selected_time,
            "requires_booking": True
        }
    
    def _handle_client_info(self, state: ConversationState, message: str) -> Dict[str, Any]:
        """Handle client information collection"""
        if "name" not in state.temp_data:
            state.temp_data["name"] = message
            return {
                "response": f"Nice to meet you, {message}! What's your email address?",
                "step": "client_info",
                "requires_booking": True
            }
        elif "email" not in state.temp_data:
            state.temp_data["email"] = message
            state.step = "confirmation"
            
            service_info = self.services[state.selected_service]
            return {
                "response": f"Perfect! Let me confirm your appointment:\n\n" +
                           f"Service: {service_info['name']}\n" +
                           f"Date: {state.selected_date}\n" +
                           f"Time: {state.selected_time}\n" +
                           f"Name: {state.temp_data['name']}\n" +
                           f"Email: {state.temp_data['email']}\n\n" +
                           f"Total: {service_info['price']}\n\n" +
                           "Reply 'YES' to confirm your booking, or 'NO' to cancel.",
                "step": "confirmation",
                "requires_booking": True
            }
    
    def _handle_confirmation(self, state: ConversationState, message: str) -> Dict[str, Any]:
        """Handle booking confirmation"""
        message_lower = message.lower()
        
        if message_lower in ["yes", "confirm", "book it", "ok", "sure"]:
            try:
                # Create or update client profile
                client_data = {
                    "name": state.temp_data["name"],
                    "email": state.temp_data["email"],
                    "phone": state.phone_number
                }
                
                if self.db_service:
                    # Try to find existing client
                    client = self.db_service.get_client_by_phone(state.phone_number)
                    
                    if client:
                        # Update existing client
                        client_id = client.id
                        self.db_service.update_client(client_id, client_data)
                    else:
                        # Create new client
                        client = self.db_service.create_client(client_data)
                        client_id = client.id
                    
                    # Parse date and time
                    appointment_datetime = self._parse_datetime(state.selected_date, state.selected_time)
                    service_info = self.services[state.selected_service]
                    
                    # Create appointment
                    appointment = self.db_service.create_appointment(
                        client_id=client_id,
                        date=appointment_datetime,
                        service=service_info["name"],
                        duration=service_info["duration"],
                        notes=f"Booked via SMS on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    )
                    
                    if appointment:
                        state.step = "completed"
                        return {
                            "response": f"Excellent! Your appointment is confirmed for {state.selected_date} at {state.selected_time}.\n\n" +
                                      "You'll receive a confirmation email shortly. We look forward to seeing you!\n\n" +
                                      "If you need to make any changes, just text us back.",
                            "step": "completed",
                            "booking_confirmed": True,
                            "requires_booking": False,
                            "appointment_id": appointment
                        }
                    else:
                        raise Exception("Failed to create appointment")
                        
                else:
                    self.logger.error("Database service not available")
                    return {
                        "response": "I apologize, but I'm having trouble accessing our booking system. Please call us directly to book your appointment.",
                        "step": "error",
                        "requires_booking": False,
                        "error": "Database service not available"
                    }
                    
            except Exception as e:
                self.logger.error(f"Error creating appointment: {str(e)}")
                return {
                    "response": "I apologize, but there was an error booking your appointment. Please call us directly to book.",
                    "step": "error",
                    "requires_booking": False,
                    "error": str(e)
                }
        elif message_lower in ["no", "cancel", "nevermind"]:
            state.step = "greeting"
            return {
                "response": "No problem! Your booking has been cancelled. Feel free to text us anytime to book a new appointment.",
                "step": "greeting",
                "booking_cancelled": True,
                "requires_booking": False
            }
        else:
            return {
                "response": "I didn't understand. Please reply 'YES' to confirm your booking, or 'NO' to cancel.",
                "step": "confirmation",
                "requires_booking": True
            }
    
    def _format_services(self) -> str:
        """Format available services for display"""
        services_text = ""
        for key, service in self.services.items():
            services_text += f"• {service['name']} - {service['price']}\n"
        return services_text.strip()
    
    def clear_conversation(self, phone_number: str):
        """Clear conversation state for a phone number"""
        if phone_number in self.conversations:
            del self.conversations[phone_number]
    
    def get_conversation_summary(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """Get summary of current conversation state"""
        if phone_number not in self.conversations:
            return None
        
        state = self.conversations[phone_number]
        return {
            "step": state.step,
            "selected_service": state.selected_service,
            "selected_date": state.selected_date,
            "selected_time": state.selected_time,
            "client_info": state.client_info.dict() if state.client_info else None,
            "temp_data": state.temp_data
        }
        
    def _parse_datetime(self, date_str: str, time_str: str) -> datetime:
        """Parse date and time strings into datetime object"""
        try:
            # Handle relative dates
            date_lower = date_str.lower()
            if date_lower == "today":
                date = datetime.now()
            elif date_lower == "tomorrow":
                date = datetime.now() + timedelta(days=1)
            elif date_lower.startswith("next"):
                # Handle "next monday", "next tuesday", etc.
                day_name = date_lower.split()[1]
                date = self._get_next_day_of_week(day_name)
            else:
                # Try to parse as explicit date
                date = datetime.strptime(date_str, "%B %d")
                # Add year
                current_year = datetime.now().year
                date = date.replace(year=current_year)
                # If the date is in the past, add a year
                if date < datetime.now():
                    date = date.replace(year=current_year + 1)
            
            # Parse time
            time = datetime.strptime(time_str, "%I:%M %p").time()
            
            # Combine date and time
            return datetime.combine(date.date(), time)
            
        except Exception as e:
            self.logger.error(f"Error parsing datetime: {str(e)}")
            raise ValueError("Invalid date or time format")
            
    def _get_next_day_of_week(self, day_name: str) -> datetime:
        """Get the next occurrence of a day of the week"""
        days = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6
        }
        
        target_day = days.get(day_name.lower())
        if target_day is None:
            raise ValueError(f"Invalid day name: {day_name}")
            
        current = datetime.now()
        days_ahead = target_day - current.weekday()
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7
            
        return current + timedelta(days=days_ahead)