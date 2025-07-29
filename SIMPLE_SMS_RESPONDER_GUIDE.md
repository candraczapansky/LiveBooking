# Simple SMS Responder - Easy to Edit Guide

## 🎯 **Overview**

This is a **streamlined, easy-to-edit** SMS responder that handles the most common scenarios with minimal complexity.

## 📁 **File Structure**

```
server/sms-simple-responder.ts  # Main responder (only 300 lines!)
test-simple-responder.js        # Test file
```

## 🔧 **How to Edit**

### **1. Change Responses**

**Location:** `server/sms-simple-responder.ts`

**To change a greeting response:**
```typescript
// Find this line (around line 100):
if (this.isGreeting(text)) {
  return 'Hey there! Welcome to Glo Head Spa! How can I help you today? 💆‍♀️✨';
}

// Change it to:
if (this.isGreeting(text)) {
  return 'Hello! Thanks for reaching out to Glo Head Spa! How can I assist you? 💆‍♀️✨';
}
```

**To change service prices:**
```typescript
// Find this line (around line 150):
return 'Here are our current prices:\n• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n\nWould you like to book an appointment? 💆‍♀️✨';

// Change it to:
return 'Here are our current prices:\n• Signature Head Spa - $89 (60 minutes)\n• Deluxe Head Spa - $150 (90 minutes)\n• Platinum Head Spa - $200 (120 minutes)\n\nWould you like to book an appointment? 💆‍♀️✨';
```

### **2. Add New Services**

**Location:** `server/sms-simple-responder.ts`

**Step 1:** Add to the service list (around line 250):
```typescript
private extractService(text: string): string | null {
  const services = ['signature head spa', 'deluxe head spa', 'platinum head spa', 'new service name'];
  // ...
}
```

**Step 2:** Update all response messages to include the new service:
```typescript
// Find all instances of the service list and add your new service:
'• Signature Head Spa - $99 (60 minutes)\n• Deluxe Head Spa - $160 (90 minutes)\n• Platinum Head Spa - $220 (120 minutes)\n• New Service - $180 (75 minutes)'
```

### **3. Change Business Hours**

**Location:** `server/sms-simple-responder.ts`

**Find this line (around line 160):**
```typescript
if (text.includes('hours') || text.includes('when are you open')) {
  return 'We\'re open Monday through Saturday, 9:00 AM to 6:00 PM. Sundays we\'re closed. What day works best for you? 📅';
}
```

**Change it to:**
```typescript
if (text.includes('hours') || text.includes('when are you open')) {
  return 'We\'re open Tuesday through Saturday, 10:00 AM to 7:00 PM. Sundays and Mondays we\'re closed. What day works best for you? 📅';
}
```

### **4. Add New Message Types**

**Location:** `server/sms-simple-responder.ts`

**Step 1:** Add detection method (around line 120):
```typescript
private isNewMessageType(text: string): boolean {
  const keywords = ['your new keywords', 'another keyword'];
  return keywords.some(k => text.includes(k));
}
```

**Step 2:** Add handler method:
```typescript
private handleNewMessageType(text: string): string {
  return 'Your custom response here!';
}
```

**Step 3:** Add to main response logic (around line 90):
```typescript
// Add this after the existing checks:
if (this.isNewMessageType(text)) {
  return this.handleNewMessageType(text);
}
```

### **5. Change Available Times**

**Location:** `server/sms-simple-responder.ts`

**Find this line (around line 200):**
```typescript
return `Great! Here are the available times for ${date}:\n\n• 9:00 AM\n• 11:00 AM\n• 1:00 PM\n• 3:00 PM\n• 5:00 PM\n\nWhich time works best for you? ⏰`;
```

**Change it to:**
```typescript
return `Great! Here are the available times for ${date}:\n\n• 10:00 AM\n• 12:00 PM\n• 2:00 PM\n• 4:00 PM\n• 6:00 PM\n\nWhich time works best for you? ⏰`;
```

## 🧪 **Testing Your Changes**

**Run the test:**
```bash
node test-simple-responder.js
```

**Expected output:**
```
🧪 Testing Simple SMS Responder

📱 Testing conversation flow:

1. User: "Hi"
   Bot: "Hey there! Welcome to Glo Head Spa! How can I help you today? 💆‍♀️✨"

2. User: "I want to book an appointment"
   Bot: "Great! I'd love to help you book an appointment. What service would you like?..."

3. User: "Signature Head Spa"
   Bot: "Perfect! What date would you like to come in? You can say "tomorrow", "Friday", or any day that works for you. 📅"

4. User: "Tomorrow"
   Bot: "Great! Here are the available times for tomorrow: 9:00 AM, 11:00 AM, 1:00 PM, 3:00 PM, 5:00 PM..."

5. User: "3pm"
   Bot: "Perfect! I've booked your signature head spa appointment for tomorrow at 3pm. You'll receive a confirmation shortly. Thank you for choosing Glo Head Spa! ✨"
✅ SUCCESS: Time "3pm" was correctly processed!
```

## 📋 **Common Edits**

### **Change Phone Number**
**Find:** `9189325396` (in reschedule and cancel responses)
**Replace:** With your actual phone number

### **Change Business Name**
**Find:** `Glo Head Spa` (multiple locations)
**Replace:** With your business name

### **Change Available Times**
**Find:** The time list in `handleBookingFlow` method
**Replace:** With your actual available times

### **Add New Keywords**
**Find:** The keyword arrays in detection methods
**Add:** Your new keywords to the appropriate arrays

## 🚀 **Quick Customization Examples**

### **Example 1: Change to a Restaurant**
```typescript
// Change greeting
return 'Welcome to [Restaurant Name]! How can I help you today? 🍽️';

// Change services to menu items
const services = ['pizza', 'pasta', 'salad', 'dessert'];

// Change booking flow to reservation flow
return 'Great! I\'d love to help you make a reservation. How many people?';
```

### **Example 2: Change to a Salon**
```typescript
// Change services
const services = ['haircut', 'hair color', 'styling', 'manicure', 'pedicure'];

// Update prices
return 'Here are our current prices:\n• Haircut - $45\n• Hair Color - $120\n• Styling - $35\n• Manicure - $25\n• Pedicure - $35';
```

### **Example 3: Add Appointment Confirmation**
```typescript
// In the final booking step, add:
return `Perfect! I've booked your ${conversation.service} appointment for ${conversation.date} at ${time}. 
You'll receive a confirmation text shortly. 
Please arrive 10 minutes early for your appointment. 
Thank you for choosing Glo Head Spa! ✨`;
```

## ⚡ **Benefits of This Simple Version**

1. **Easy to Read**: Only 300 lines vs 2000+ lines
2. **Easy to Edit**: Clear, linear flow
3. **Easy to Test**: Simple test file
4. **Easy to Debug**: Minimal complexity
5. **Easy to Extend**: Clear structure for adding features

## 🎯 **Key Features**

- ✅ **Greetings**: Simple "Hi" responses
- ✅ **Business Questions**: Pricing, services, hours
- ✅ **Booking Flow**: Service → Date → Time → Confirmation
- ✅ **Reschedule/Cancel**: Direct to phone
- ✅ **Time Recognition**: Handles "3pm", "3:00pm", "3 pm", etc.
- ✅ **Conversation Memory**: Remembers where you are in the booking process

This streamlined version is **much easier to understand and edit** than the complex version, while still handling all the essential functionality! 