// API functions for forms

export interface CreateFormData {
  title: string;
  description?: string;
  type: 'intake' | 'feedback' | 'booking';
  status: 'active' | 'draft' | 'inactive';
}

export interface Form {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  submissions: number;
  lastSubmission?: string;
  createdAt: string;
}

// Save a new form to the database
export async function createForm(formData: CreateFormData): Promise<Form> {
  const response = await fetch('/api/forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create form');
  }

  return response.json();
}

// Get all forms from the database
export async function getForms(): Promise<Form[]> {
  const response = await fetch('/api/forms');
  
  if (!response.ok) {
    throw new Error('Failed to fetch forms');
  }

  return response.json();
}

// Get a single form by ID
export async function getForm(id: number): Promise<Form> {
  const response = await fetch(`/api/forms/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch form');
  }

  return response.json();
} 