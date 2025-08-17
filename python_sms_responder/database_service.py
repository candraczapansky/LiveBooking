import os
import psycopg2
import psycopg2.extras
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from .models import ClientInfo, AppointmentInfo

class DatabaseService:
    """Service for handling database operations"""
    
    def __init__(self):
        self.connection_string = os.getenv("DATABASE_URL")
        if not self.connection_string:
            # Fallback to individual environment variables
            self.connection_string = self._build_connection_string()
        
        self.logger = logging.getLogger(__name__)
    
    def _build_connection_string(self) -> str:
        """Build database connection string from individual environment variables"""
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        database = os.getenv("DB_NAME", "salon_db")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        
        return f"postgresql://{user}:{password}@{host}:{port}/{database}"
    
    def _get_connection(self):
        """Get database connection"""
        try:
            return psycopg2.connect(self.connection_string)
        except Exception as e:
            self.logger.error(f"Database connection error: {str(e)}")
            raise
    
    async def get_client_by_phone(self, phone_number: str) -> Optional[ClientInfo]:
        """
        Get client information by phone number
        
        Args:
            phone_number: Client's phone number
            
        Returns:
            ClientInfo: Client information or None if not found
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Clean phone number for comparison
            clean_phone = self._clean_phone_number(phone_number)
            
            # Query for client information
            query = """
                SELECT 
                    c.id,
                    c.name,
                    c.phone,
                    c.email,
                    c.preferences,
                    COUNT(a.id) as total_appointments,
                    MAX(a.date) as last_appointment
                FROM clients c
                LEFT JOIN appointments a ON c.id = a.client_id
                WHERE c.phone = %s OR c.phone = %s OR c.phone = %s
                GROUP BY c.id, c.name, c.phone, c.email, c.preferences
                LIMIT 1
            """
            
            # Try different phone number formats
            phone_variations = [
                clean_phone,
                self._format_phone_with_country_code(clean_phone),
                self._format_phone_without_country_code(clean_phone)
            ]
            
            cursor.execute(query, phone_variations)
            result = cursor.fetchone()
            
            if result:
                # Get upcoming appointments
                upcoming_appointments = await self._get_upcoming_appointments(result['id'])
                
                return ClientInfo(
                    id=result['id'],
                    name=result['name'],
                    phone=result['phone'],
                    email=result['email'],
                    preferences=result['preferences'],
                    last_appointment=result['last_appointment'],
                    upcoming_appointments=upcoming_appointments,
                    total_appointments=result['total_appointments']
                )
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting client by phone: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()
    
    async def _get_upcoming_appointments(self, client_id: int) -> List[AppointmentInfo]:
        """
        Get upcoming appointments for a client
        
        Args:
            client_id: Client ID
            
        Returns:
            List[AppointmentInfo]: List of upcoming appointments
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            query = """
                SELECT 
                    id,
                    date,
                    service,
                    duration,
                    status,
                    notes
                FROM appointments
                WHERE client_id = %s 
                AND date >= NOW()
                AND status != 'cancelled'
                ORDER BY date ASC
                LIMIT 5
            """
            
            cursor.execute(query, (client_id,))
            results = cursor.fetchall()
            
            appointments = []
            for row in results:
                appointments.append(AppointmentInfo(
                    id=row['id'],
                    date=row['date'],
                    service=row['service'],
                    duration=row['duration'],
                    status=row['status'],
                    notes=row['notes']
                ))
            
            return appointments
            
        except Exception as e:
            self.logger.error(f"Error getting upcoming appointments: {str(e)}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()
    
    async def get_available_slots(self, date: datetime, service: str = None) -> List[Dict[str, Any]]:
        """
        Get available appointment slots for a given date
        
        Args:
            date: Date to check availability for
            service: Specific service to check (optional)
            
        Returns:
            List[Dict]: List of available time slots
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Define business hours
            start_time = datetime.combine(date.date(), datetime.min.time().replace(hour=9))
            end_time = datetime.combine(date.date(), datetime.min.time().replace(hour=19))
            
            # Get booked appointments for the date
            query = """
                SELECT 
                    date,
                    duration,
                    service
                FROM appointments
                WHERE DATE(date) = %s
                AND status != 'cancelled'
                ORDER BY date
            """
            
            cursor.execute(query, (date.date(),))
            booked_appointments = cursor.fetchall()
            
            # Generate available slots (30-minute intervals)
            available_slots = []
            current_time = start_time
            
            while current_time < end_time:
                slot_end = current_time + timedelta(minutes=30)
                
                # Check if slot conflicts with any booked appointment
                is_available = True
                for appointment in booked_appointments:
                    appointment_start = appointment['date']
                    appointment_end = appointment_start + timedelta(minutes=appointment['duration'])
                    
                    # Check for overlap
                    if (current_time < appointment_end and slot_end > appointment_start):
                        is_available = False
                        break
                
                if is_available:
                    available_slots.append({
                        "time": current_time.strftime("%H:%M"),
                        "datetime": current_time.isoformat(),
                        "duration": 30
                    })
                
                current_time += timedelta(minutes=30)
            
            return available_slots
            
        except Exception as e:
            self.logger.error(f"Error getting available slots: {str(e)}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()
    
    async def create_appointment(
        self, 
        client_id: int, 
        date: datetime, 
        service: str, 
        duration: int = 60,
        notes: str = None
    ) -> Optional[int]:
        """
        Create a new appointment
        
        Args:
            client_id: Client ID
            date: Appointment date and time
            service: Service name
            duration: Duration in minutes
            notes: Additional notes
            
        Returns:
            int: Appointment ID if created successfully, None otherwise
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO appointments (client_id, date, service, duration, status, notes)
                VALUES (%s, %s, %s, %s, 'confirmed', %s)
                RETURNING id
            """
            
            cursor.execute(query, (client_id, date, service, duration, notes))
            appointment_id = cursor.fetchone()[0]
            
            conn.commit()
            self.logger.info(f"Created appointment {appointment_id} for client {client_id}")
            
            return appointment_id
            
        except Exception as e:
            self.logger.error(f"Error creating appointment: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
            return None
        finally:
            if 'conn' in locals():
                conn.close()
    
    async def update_appointment(
        self, 
        appointment_id: int, 
        **kwargs
    ) -> bool:
        """
        Update an existing appointment
        
        Args:
            appointment_id: Appointment ID
            **kwargs: Fields to update
            
        Returns:
            bool: True if updated successfully
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Build dynamic update query
            valid_fields = ['date', 'service', 'duration', 'status', 'notes']
            update_fields = []
            values = []
            
            for field, value in kwargs.items():
                if field in valid_fields and value is not None:
                    update_fields.append(f"{field} = %s")
                    values.append(value)
            
            if not update_fields:
                return False
            
            values.append(appointment_id)
            query = f"""
                UPDATE appointments 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            
            cursor.execute(query, values)
            conn.commit()
            
            self.logger.info(f"Updated appointment {appointment_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error updating appointment: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
            return False
        finally:
            if 'conn' in locals():
                conn.close()
    
    def _clean_phone_number(self, phone: str) -> str:
        """Clean phone number for database comparison"""
        return ''.join(filter(str.isdigit, phone))
    
    def _format_phone_with_country_code(self, phone: str) -> str:
        """Format phone number with country code"""
        if len(phone) == 10:
            return f"1{phone}"
        return phone
    
    def _format_phone_without_country_code(self, phone: str) -> str:
        """Format phone number without country code"""
        if len(phone) == 11 and phone.startswith('1'):
            return phone[1:]
        return phone
    
    async def check_health(self) -> dict:
        """
        Check database service health
        
        Returns:
            dict: Health status information
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Test simple query
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            return {
                "status": "healthy",
                "connection": "successful",
                "database_url_configured": bool(self.connection_string)
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
        finally:
            if 'conn' in locals():
                conn.close() 