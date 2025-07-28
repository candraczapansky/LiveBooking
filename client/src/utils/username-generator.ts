// Username generation and validation utilities

export function generateUsername(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now().toString().slice(-4);
  return `${base}${timestamp}`;
}

export function generateAlternativeUsername(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base}${randomSuffix}`;
}

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/users?search=${encodeURIComponent(username)}`);
    if (!response.ok) {
      return false;
    }
    
    const users = await response.json();
    const existingUser = users.find((user: any) => user.username === username);
    return !existingUser;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}

export async function suggestUsernames(firstName: string, lastName: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  // Generate base username
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
  
  // Try different variations
  const variations = [
    base,
    `${base}${Date.now().toString().slice(-3)}`,
    `${base}${Math.random().toString(36).substring(2, 5)}`,
    `${firstName.toLowerCase()}${Math.random().toString(36).substring(2, 4)}`,
    `${lastName.toLowerCase()}${Math.random().toString(36).substring(2, 4)}`,
  ];
  
  // Check availability for each variation
  for (const variation of variations) {
    const isAvailable = await checkUsernameAvailability(variation);
    if (isAvailable && suggestions.length < 3) {
      suggestions.push(variation);
    }
  }
  
  return suggestions;
} 