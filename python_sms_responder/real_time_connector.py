import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import psycopg2
import psycopg2.extras

class RealTimeDataConnector:
    """Connects to the salon database to fetch real-time data for the LLM"""
    
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
    
    def get_available_slots(self, date_range_days: int = 7) -> Dict[str, List[Dict]]:
        """
        Get available appointment slots for the next X days
        
        Args:
            date_range_days: Number of days to look ahead (default: 7)
            
        Returns:
            Dict mapping dates to lists of available time slots
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            result = {}
            today = datetime.now().date()
            
            # Check each day in the date range
            for day_offset in range(date_range_days):
                check_date = today + timedelta(days=day_offset)
                date_str = check_date.strftime("%Y-%m-%d")
                
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
                
                cursor.execute(query, (check_date,))
                booked_appointments = cursor.fetchall()
                
                # Define business hours - modify as needed
                start_time = datetime.combine(check_date, datetime.min.time().replace(hour=9))
                end_time = datetime.combine(check_date, datetime.min.time().replace(hour=19))
                
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
                            "formatted_time": current_time.strftime("%-I:%M %p"),
                            "duration": 30
                        })
                    
                    current_time += timedelta(minutes=30)
                
                result[date_str] = available_slots
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error getting available slots: {str(e)}")
            return {}
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_staff_availability(self, date_range_days: int = 7) -> Dict[str, Dict[str, List[Dict]]]:
        """
        Get staff availability for the next X days
        
        Args:
            date_range_days: Number of days to look ahead (default: 7)
            
        Returns:
            Dict mapping staff members to their available days and times
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Get all staff members
            cursor.execute("SELECT id, name FROM staff WHERE active = true ORDER BY name")
            staff_members = cursor.fetchall()
            
            result = {}
            today = datetime.now().date()
            
            for staff in staff_members:
                staff_id = staff['id']
                staff_name = staff['name']
                result[staff_name] = {}
                
                # Check each day in the date range
                for day_offset in range(date_range_days):
                    check_date = today + timedelta(days=day_offset)
                    date_str = check_date.strftime("%Y-%m-%d")
                    
                    # Get staff schedule for the day
                    schedule_query = """
                        SELECT start_time, end_time
                        FROM staff_schedules
                        WHERE staff_id = %s AND DATE(start_time) = %s
                        ORDER BY start_time
                    """
                    
                    cursor.execute(schedule_query, (staff_id, check_date))
                    schedules = cursor.fetchall()
                    
                    if not schedules:
                        # Staff not scheduled this day
                        result[staff_name][date_str] = []
                        continue
                    
                    # Get booked appointments for this staff on this day
                    appointments_query = """
                        SELECT 
                            date,
                            duration,
                            service
                        FROM appointments
                        WHERE staff_id = %s AND DATE(date) = %s
                        AND status != 'cancelled'
                        ORDER BY date
                    """
                    
                    cursor.execute(appointments_query, (staff_id, check_date))
                    booked_appointments = cursor.fetchall()
                    
                    # Generate available slots based on schedule and appointments
                    available_slots = []
                    
                    for schedule in schedules:
                        schedule_start = schedule['start_time']
                        schedule_end = schedule['end_time']
                        
                        current_time = schedule_start
                        while current_time < schedule_end:
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
                                    "formatted_time": current_time.strftime("%-I:%M %p"),
                                    "duration": 30
                                })
                            
                            current_time += timedelta(minutes=30)
                    
                    result[staff_name][date_str] = available_slots
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error getting staff availability: {str(e)}")
            return {}
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_services_with_details(self) -> Dict[str, List[Dict]]:
        """
        Get all services with detailed information
        
        Returns:
            Dict mapping service categories to lists of service details
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            # Query for service categories
            cursor.execute("""
                SELECT id, name
                FROM service_categories
                WHERE active = true
                ORDER BY display_order, name
            """)
            
            categories = cursor.fetchall()
            result = {}
            
            for category in categories:
                category_id = category['id']
                category_name = category['name']
                
                # Query for services in this category
                cursor.execute("""
                    SELECT 
                        id,
                        name,
                        description,
                        price,
                        duration
                    FROM services
                    WHERE category_id = %s AND active = true
                    ORDER BY display_order, name
                """, (category_id,))
                
                services = cursor.fetchall()
                result[category_name] = [dict(service) for service in services]
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error getting services: {str(e)}")
            return {}
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_staff_by_service(self, service_id: int = None, service_name: str = None) -> List[Dict]:
        """
        Get staff members who can perform a specific service
        
        Args:
            service_id: ID of the service (optional)
            service_name: Name of the service (optional)
            
        Returns:
            List of staff members who can perform the service
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            if not service_id and not service_name:
                return []
                
            if service_name and not service_id:
                # Look up service ID by name
                cursor.execute("SELECT id FROM services WHERE name ILIKE %s", (f"%{service_name}%",))
                result = cursor.fetchone()
                if result:
                    service_id = result['id']
                else:
                    return []
            
            # Get staff members who can perform this service
            cursor.execute("""
                SELECT DISTINCT
                    s.id,
                    s.name,
                    s.title,
                    s.bio
                FROM staff s
                JOIN staff_services ss ON s.id = ss.staff_id
                WHERE ss.service_id = %s AND s.active = true
                ORDER BY s.name
            """, (service_id,))
            
            return [dict(row) for row in cursor.fetchall()]
            
        except Exception as e:
            self.logger.error(f"Error getting staff by service: {str(e)}")
            return []
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_all_real_time_data(self) -> Dict[str, Any]:
        """
        Get all real-time data needed for LLM context
        
        Returns:
            Dict with all necessary real-time data
        """
        return {
            "available_slots": self.get_available_slots(),
            "staff_availability": self.get_staff_availability(),
            "services": self.get_services_with_details()
        }
