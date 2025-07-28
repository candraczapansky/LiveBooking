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
  // Send fields as array, let the storage layer handle JSON conversion
  const dataToSend = {
    ...formData,
    fields: formData.fields || null,
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
  // Send fields as array, let the storage layer handle JSON conversion
  const dataToSend = {
    ...formData,
    fields: formData.fields || undefined,
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
  
  // Parse fields from JSON string to array with error handling
  let parsedFields = [];
  if (form.fields) {
    try {
      // If fields is already an array, use it directly
      if (Array.isArray(form.fields)) {
        parsedFields = form.fields;
      } else if (typeof form.fields === 'string') {
        // Try to parse the string
        const parsed = JSON.parse(form.fields);
        if (Array.isArray(parsed)) {
          parsedFields = parsed;
        } else {
          console.error('Parsed fields is not an array:', parsed);
          parsedFields = [];
        }
      } else {
        console.error('Fields is not a string or array:', typeof form.fields);
        parsedFields = [];
      }
    } catch (error) {
      console.error('Error parsing form fields:', error);
      parsedFields = [];
    }
  }
  
  return {
    ...form,
    fields: parsedFields,
  };
}

// Get all forms from the database
export async function getForms(): Promise<Form[]> {
  const response = await fetch('/api/forms');
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'Failed to fetch forms');
  }

  const forms = await response.json();
  
  // Parse fields from JSON string to array with error handling
  return forms.map((form: any) => {
    let parsedFields = [];
    if (form.fields) {
      try {
        // If fields is already an array, use it directly
        if (Array.isArray(form.fields)) {
          parsedFields = form.fields;
        } else if (typeof form.fields === 'string') {
          // Try to parse the string
          const parsed = JSON.parse(form.fields);
          if (Array.isArray(parsed)) {
            parsedFields = parsed;
          } else {
            console.error('Parsed fields is not an array:', parsed);
            parsedFields = [];
          }
        } else {
          console.error('Fields is not a string or array:', typeof form.fields);
          parsedFields = [];
        }
      } catch (error) {
        console.error(`Error parsing form ${form.id} fields:`, error);
        console.error('Raw fields data:', form.fields);
        parsedFields = [];
      }
    }
    
    return {
      ...form,
      fields: parsedFields,
    };
  });
}

// Get a single form by ID
export async function getForm(id: number): Promise<Form> {
  const response = await fetch(`/api/forms/${id}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || 'Failed to fetch form');
  }

  const form = await response.json();
  
  // Parse fields from JSON string to array with error handling
  let parsedFields = [];
  if (form.fields) {
    try {
      // If fields is already an array, use it directly
      if (Array.isArray(form.fields)) {
        parsedFields = form.fields;
      } else if (typeof form.fields === 'string') {
        // Try to parse the string
        const parsed = JSON.parse(form.fields);
        if (Array.isArray(parsed)) {
          parsedFields = parsed;
        } else {
          console.error('Parsed fields is not an array:', parsed);
          parsedFields = [];
        }
      } else {
        console.error('Fields is not a string or array:', typeof form.fields);
        parsedFields = [];
      }
    } catch (error) {
      console.error(`Error parsing form ${form.id} fields:`, error);
      console.error('Raw fields data:', form.fields);
      parsedFields = [];
    }
  }
  
  return {
    ...form,
    fields: parsedFields,
  };
} 