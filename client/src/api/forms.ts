// API functions for forms

export interface CreateFormData {
  title: string;
  description?: string;
  type: 'intake' | 'feedback' | 'booking';
  status: 'active' | 'draft' | 'inactive';
  fields?: any[];
}

export interface Form {
  id: number;
  title: string;
  description?: string;
  type: string;
  status: string;
  fields?: any[];
  submissions: number;
  lastSubmission?: string;
  createdAt: string;
}

// Save a new form to the database
export async function createForm(formData: CreateFormData): Promise<Form> {
  // Convert fields array to JSON string for database storage
  const dataToSend = {
    ...formData,
    fields: formData.fields ? JSON.stringify(formData.fields) : null,
  };

  const response = await fetch('/api/forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataToSend),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create form');
  }

  return response.json();
}

// Update an existing form
export async function updateForm(id: number, formData: Partial<CreateFormData>): Promise<Form> {
  // Convert fields array to JSON string for database storage
  const dataToSend = {
    ...formData,
    fields: formData.fields ? JSON.stringify(formData.fields) : undefined,
  };

  const response = await fetch(`/api/forms/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataToSend),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update form');
  }

  const form = await response.json();
  
  // Parse fields from JSON string to array
  return {
    ...form,
    fields: form.fields ? JSON.parse(form.fields) : [],
  };
}

// Get all forms from the database
export async function getForms(): Promise<Form[]> {
  const response = await fetch('/api/forms');
  
  if (!response.ok) {
    throw new Error('Failed to fetch forms');
  }

  const forms = await response.json();
  
  // Parse fields from JSON string to array
  return forms.map((form: any) => ({
    ...form,
    fields: form.fields ? JSON.parse(form.fields) : [],
  }));
}

// Get a single form by ID
export async function getForm(id: number): Promise<Form> {
  const response = await fetch(`/api/forms/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch form');
  }

  const form = await response.json();
  
  // Parse fields from JSON string to array
  return {
    ...form,
    fields: form.fields ? JSON.parse(form.fields) : [],
  };
} 