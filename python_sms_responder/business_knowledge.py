import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

class BusinessKnowledge:
    """Service for managing business-specific knowledge for the LLM"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.knowledge_file = os.getenv("BUSINESS_KNOWLEDGE_FILE", "business_knowledge.json")
        self.knowledge = self._load_knowledge()
        
    def _load_knowledge(self) -> Dict[str, Any]:
        """Load business knowledge from file"""
        try:
            if os.path.exists(self.knowledge_file):
                with open(self.knowledge_file, 'r') as f:
                    knowledge = json.load(f)
                    self.logger.info(f"Loaded business knowledge from {self.knowledge_file}")
                    return knowledge
            else:
                # Create default knowledge structure
                default_knowledge = {
                    "business": {
                        "name": "Your Salon & Spa",
                        "address": "123 Main Street, Anytown, USA",
                        "phone": "(555) 123-4567",
                        "website": "www.yoursalon.com",
                        "email": "info@yoursalon.com",
                        "hours": {
                            "monday": "9:00 AM - 7:00 PM",
                            "tuesday": "9:00 AM - 7:00 PM",
                            "wednesday": "9:00 AM - 7:00 PM",
                            "thursday": "9:00 AM - 7:00 PM",
                            "friday": "9:00 AM - 7:00 PM",
                            "saturday": "9:00 AM - 7:00 PM",
                            "sunday": "10:00 AM - 5:00 PM"
                        },
                        "description": "A full-service salon and spa offering hair, nail, and skin services."
                    },
                    "services": {
                        "hair": [
                            {"name": "Women's Haircut", "price": "$45-65", "duration": 60, "description": "Includes consultation, shampoo, cut and style."},
                            {"name": "Men's Haircut", "price": "$30-45", "duration": 30, "description": "Includes consultation, shampoo, cut and style."},
                            {"name": "Children's Haircut", "price": "$25-35", "duration": 30, "description": "For children 12 and under."},
                            {"name": "Hair Color", "price": "$85-150", "duration": 120, "description": "Full color service including root touch-up or full head."},
                            {"name": "Highlights", "price": "$95-200", "duration": 150, "description": "Partial or full foil highlights."},
                            {"name": "Balayage", "price": "$120-250", "duration": 180, "description": "Hand-painted highlights for a natural, sun-kissed look."},
                            {"name": "Blowout", "price": "$35-55", "duration": 45, "description": "Shampoo, conditioning, and blowdry styling."},
                            {"name": "Updo", "price": "$55-95", "duration": 60, "description": "Formal styling for special occasions."}
                        ],
                        "skin": [
                            {"name": "Express Facial", "price": "$45", "duration": 30, "description": "Quick facial treatment for on-the-go clients."},
                            {"name": "Signature Facial", "price": "$85", "duration": 60, "description": "Customized facial treatment for all skin types."},
                            {"name": "Deep Cleansing Facial", "price": "$95", "duration": 75, "description": "Deep pore cleansing and extraction."},
                            {"name": "Anti-Aging Facial", "price": "$110", "duration": 75, "description": "Targets fine lines and wrinkles."}
                        ],
                        "nails": [
                            {"name": "Manicure", "price": "$30", "duration": 30, "description": "Nail shaping, cuticle care, hand massage, and polish."},
                            {"name": "Pedicure", "price": "$45", "duration": 45, "description": "Foot soak, exfoliation, nail and cuticle care, massage, and polish."},
                            {"name": "Gel Manicure", "price": "$45", "duration": 45, "description": "Gel polish application that lasts up to 2 weeks."},
                            {"name": "Gel Pedicure", "price": "$60", "duration": 60, "description": "Pedicure with gel polish application."}
                        ],
                        "massage": [
                            {"name": "Swedish Massage", "price": "$80", "duration": 60, "description": "Relaxation massage with light to medium pressure."},
                            {"name": "Deep Tissue Massage", "price": "$90", "duration": 60, "description": "Targets deeper muscle layers with firm pressure."},
                            {"name": "Hot Stone Massage", "price": "$100", "duration": 75, "description": "Heated stones used to enhance relaxation and relieve tension."},
                            {"name": "Prenatal Massage", "price": "$85", "duration": 60, "description": "Safe, comfortable massage for expectant mothers."}
                        ]
                    },
                    "faqs": [
                        {
                            "question": "How do I book an appointment?",
                            "answer": "You can book an appointment by calling us directly, through our website, or by texting this number with your preferred service, date, and time."
                        },
                        {
                            "question": "What is your cancellation policy?",
                            "answer": "We require 24 hours notice for cancellations. Late cancellations or no-shows may result in a charge of 50% of the service price."
                        },
                        {
                            "question": "Do you take walk-ins?",
                            "answer": "We accept walk-ins based on availability. For guaranteed service, we recommend booking in advance."
                        },
                        {
                            "question": "What forms of payment do you accept?",
                            "answer": "We accept all major credit cards, debit cards, cash, and digital payment methods like Apple Pay and Google Pay."
                        },
                        {
                            "question": "Do you sell gift certificates?",
                            "answer": "Yes, we offer gift certificates in any denomination, which can be purchased in-store or through our website."
                        }
                    ],
                    "promotions": [
                        {
                            "title": "New Client Special",
                            "description": "15% off your first service with us.",
                            "expiration_date": "2023-12-31",
                            "code": "NEWCLIENT15"
                        },
                        {
                            "title": "Refer a Friend",
                            "description": "Refer a friend and you both receive $15 off your next service.",
                            "expiration_date": "2023-12-31",
                            "code": "REFERRAL15"
                        }
                    ],
                    "staff": [
                        {
                            "name": "Sarah Johnson",
                            "title": "Master Stylist",
                            "specialties": ["Hair Color", "Balayage", "Haircuts"],
                            "bio": "Sarah has over 10 years of experience specializing in dimensional color and precision cutting."
                        },
                        {
                            "name": "Michael Chen",
                            "title": "Esthetician",
                            "specialties": ["Facials", "Waxing", "Skin Care"],
                            "bio": "Michael is a licensed esthetician with expertise in treating various skin concerns."
                        },
                        {
                            "name": "Emma Rodriguez",
                            "title": "Nail Technician",
                            "specialties": ["Gel Nails", "Nail Art", "Pedicures"],
                            "bio": "Emma creates beautiful, long-lasting nail designs and provides excellent nail care."
                        }
                    ]
                }
                
                # Save default knowledge to file
                self._save_knowledge(default_knowledge)
                self.logger.info(f"Created default business knowledge file: {self.knowledge_file}")
                return default_knowledge
                
        except Exception as e:
            self.logger.error(f"Error loading business knowledge: {str(e)}")
            return {
                "business": {
                    "name": "Your Salon & Spa",
                    "hours": "Monday-Saturday 9AM-7PM, Sunday 10AM-5PM",
                    "phone": "(555) 123-4567"
                },
                "services": {},
                "faqs": []
            }
    
    def _save_knowledge(self, knowledge: Dict[str, Any]) -> bool:
        """Save business knowledge to file"""
        try:
            with open(self.knowledge_file, 'w') as f:
                json.dump(knowledge, f, indent=2)
            self.logger.info(f"Saved business knowledge to {self.knowledge_file}")
            return True
        except Exception as e:
            self.logger.error(f"Error saving business knowledge: {str(e)}")
            return False
    
    def get_all_knowledge(self) -> Dict[str, Any]:
        """Get all business knowledge"""
        return self.knowledge
    
    def get_business_info(self) -> Dict[str, Any]:
        """Get basic business information"""
        return self.knowledge.get("business", {})
    
    def get_services(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all services by category"""
        return self.knowledge.get("services", {})
    
    def get_faqs(self) -> List[Dict[str, str]]:
        """Get all FAQs"""
        return self.knowledge.get("faqs", [])
    
    def get_promotions(self) -> List[Dict[str, Any]]:
        """Get all active promotions"""
        now = datetime.now()
        active_promotions = []
        
        for promo in self.knowledge.get("promotions", []):
            # Check if promotion has an expiration date and if it's still valid
            if "expiration_date" in promo:
                exp_date = datetime.strptime(promo["expiration_date"], "%Y-%m-%d")
                if exp_date >= now:
                    active_promotions.append(promo)
            else:
                # No expiration date, consider it active
                active_promotions.append(promo)
                
        return active_promotions
    
    def get_staff(self) -> List[Dict[str, Any]]:
        """Get all staff information"""
        return self.knowledge.get("staff", [])
    
    def add_faq(self, question: str, answer: str) -> bool:
        """Add a new FAQ"""
        try:
            if "faqs" not in self.knowledge:
                self.knowledge["faqs"] = []
                
            self.knowledge["faqs"].append({
                "question": question,
                "answer": answer
            })
            
            return self._save_knowledge(self.knowledge)
        except Exception as e:
            self.logger.error(f"Error adding FAQ: {str(e)}")
            return False
    
    def add_service(self, category: str, service: Dict[str, Any]) -> bool:
        """Add a new service"""
        try:
            if "services" not in self.knowledge:
                self.knowledge["services"] = {}
                
            if category not in self.knowledge["services"]:
                self.knowledge["services"][category] = []
                
            self.knowledge["services"][category].append(service)
            
            return self._save_knowledge(self.knowledge)
        except Exception as e:
            self.logger.error(f"Error adding service: {str(e)}")
            return False
    
    def add_promotion(self, promotion: Dict[str, Any]) -> bool:
        """Add a new promotion"""
        try:
            if "promotions" not in self.knowledge:
                self.knowledge["promotions"] = []
                
            self.knowledge["promotions"].append(promotion)
            
            return self._save_knowledge(self.knowledge)
        except Exception as e:
            self.logger.error(f"Error adding promotion: {str(e)}")
            return False
    
    def update_business_info(self, info: Dict[str, Any]) -> bool:
        """Update business information"""
        try:
            if "business" not in self.knowledge:
                self.knowledge["business"] = {}
                
            # Update only provided fields
            for key, value in info.items():
                self.knowledge["business"][key] = value
                
            return self._save_knowledge(self.knowledge)
        except Exception as e:
            self.logger.error(f"Error updating business info: {str(e)}")
            return False
    
    def get_knowledge_for_llm(self) -> str:
        """Format business knowledge for LLM prompts"""
        knowledge_parts = []
        
        # Add business info
        business = self.get_business_info()
        if business:
            knowledge_parts.append(f"# {business.get('name', 'Salon & Spa')} Information")
            if 'description' in business:
                knowledge_parts.append(f"{business['description']}")
            knowledge_parts.append(f"Address: {business.get('address', 'N/A')}")
            knowledge_parts.append(f"Phone: {business.get('phone', 'N/A')}")
            knowledge_parts.append(f"Email: {business.get('email', 'N/A')}")
            knowledge_parts.append(f"Website: {business.get('website', 'N/A')}")
            
            # Add business hours
            knowledge_parts.append("\n## Business Hours:")
            if isinstance(business.get('hours'), dict):
                for day, hours in business['hours'].items():
                    knowledge_parts.append(f"{day.capitalize()}: {hours}")
            else:
                knowledge_parts.append(str(business.get('hours', 'Monday-Saturday 9AM-7PM, Sunday 10AM-5PM')))
            
            knowledge_parts.append("")
        
        # Add services by category
        services = self.get_services()
        if services:
            knowledge_parts.append("# Services")
            for category, service_list in services.items():
                knowledge_parts.append(f"\n## {category.capitalize()} Services:")
                for service in service_list:
                    knowledge_parts.append(f"- {service.get('name')}: {service.get('price')} - {service.get('description', 'No description available')} ({service.get('duration', 'N/A')} minutes)")
            knowledge_parts.append("")
        
        # Add FAQs
        faqs = self.get_faqs()
        if faqs:
            knowledge_parts.append("# Frequently Asked Questions")
            for faq in faqs:
                knowledge_parts.append(f"Q: {faq.get('question', '')}")
                knowledge_parts.append(f"A: {faq.get('answer', '')}")
                knowledge_parts.append("")
        
        # Add active promotions
        promotions = self.get_promotions()
        if promotions:
            knowledge_parts.append("# Current Promotions")
            for promo in promotions:
                knowledge_parts.append(f"- {promo.get('title')}: {promo.get('description')}")
                if promo.get('code'):
                    knowledge_parts.append(f"  Use code: {promo.get('code')}")
                if promo.get('expiration_date'):
                    knowledge_parts.append(f"  Valid until: {promo.get('expiration_date')}")
                knowledge_parts.append("")
        
        # Add staff information
        staff = self.get_staff()
        if staff:
            knowledge_parts.append("# Our Staff")
            for person in staff:
                knowledge_parts.append(f"- {person.get('name')} - {person.get('title')}")
                if person.get('specialties'):
                    knowledge_parts.append(f"  Specialties: {', '.join(person.get('specialties', []))}")
                if person.get('bio'):
                    knowledge_parts.append(f"  {person.get('bio')}")
                knowledge_parts.append("")
        
        return "\n".join(knowledge_parts)
