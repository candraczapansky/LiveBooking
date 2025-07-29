// Test to see what the current system is doing
console.log('🔍 Testing Current System Behavior\n');

// Simulate the exact conversation flow
const conversation = {
  step: 'time',
  service: 'signature head spa',
  date: 'tomorrow'
};

const text = '3pm';
console.log('Input:', text);
console.log('Current step:', conversation.step);
console.log('Current service:', conversation.service);
console.log('Current date:', conversation.date);

// Test the exact logic that should be running
if (conversation.step === 'time') {
  console.log('✅ Step is "time" - proceeding to time selection');
  
  // Test the old logic (what might still be running)
  const timePatterns = [
    /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,  // 3pm, 3:00pm, 3:30pm
    /(\d{1,2})\s*(am|pm)/i,             // 3 pm, 3 am
    /(\d{1,2}):(\d{2})/i,               // 15:30, 3:30
    /(\d{1,2})/                          // 3 (assume PM)
  ];
  
  let extractedTime = null;
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let time = match[0];
      if (/^\d{1,2}$/.test(time)) {
        time = time + 'pm';
      }
      time = time.replace(/\s+/g, '').toLowerCase();
      extractedTime = time;
      console.log('🔍 Regex pattern matched:', pattern.toString(), '→', time);
      break;
    }
  }
  
  console.log('🔍 Extracted time (old method):', extractedTime);
  
  // Test the new logic (what should be working)
  let newTime = null;
  if (text.includes('3pm') || text.includes('3:00pm') || text.includes('3 pm') || text === '3') {
    newTime = '3pm';
    console.log('✅ New method found time:', newTime);
  }
  
  console.log('\n📊 Results:');
  console.log('Old method result:', extractedTime);
  console.log('New method result:', newTime);
  
  if (extractedTime) {
    console.log('✅ OLD METHOD WOULD WORK');
  } else {
    console.log('❌ OLD METHOD FAILED');
  }
  
  if (newTime) {
    console.log('✅ NEW METHOD WOULD WORK');
  } else {
    console.log('❌ NEW METHOD FAILED');
  }
  
} else {
  console.log('❌ Step is not "time" - this is the problem!');
  console.log('Current step:', conversation.step);
}

console.log('\n🔍 Let me also test what happens with different inputs:');
const testInputs = ['3pm', '3:00pm', '3 pm', '3', '3:30pm', 'not a time'];

for (const input of testInputs) {
  console.log(`\nTesting "${input}":`);
  
  // Old method
  let oldResult = null;
  const timePatterns = [
    /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})/i,
    /(\d{1,2})/
  ];
  
  for (const pattern of timePatterns) {
    const match = input.match(pattern);
    if (match) {
      let time = match[0];
      if (/^\d{1,2}$/.test(time)) {
        time = time + 'pm';
      }
      time = time.replace(/\s+/g, '').toLowerCase();
      oldResult = time;
      break;
    }
  }
  
  // New method
  let newResult = null;
  if (input.includes('3pm') || input.includes('3:00pm') || input.includes('3 pm') || input === '3') {
    newResult = '3pm';
  }
  
  console.log(`  Old method: ${oldResult || 'FAILED'}`);
  console.log(`  New method: ${newResult || 'FAILED'}`);
} 