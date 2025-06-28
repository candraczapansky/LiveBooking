import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AntiAutofillInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const AntiAutofillInput: React.FC<AntiAutofillInputProps> = ({ 
  className, 
  value, 
  onChange, 
  ...props 
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const [randomId] = useState(() => `nosave_${Math.random().toString(36).substr(2, 15)}`);
  const [randomName] = useState(() => `field_${Math.random().toString(36).substr(2, 15)}`);
  
  // Sync external value changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      // Force update the DOM input value
      if (inputRef.current) {
        inputRef.current.value = value;
      }
    }
  }, [value, internalValue]);

  // Ultra-aggressive monitoring for autofill
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Multiple monitoring strategies
    const interval1 = setInterval(() => {
      if (input.value !== value && input.value !== internalValue) {
        console.log(`AUTOFILL BLOCKED: "${input.value}" → "${value}"`);
        input.value = value;
        setInternalValue(value);
      }
    }, 50); // Check every 50ms

    const interval2 = setInterval(() => {
      // Force reset if value differs
      if (input.value !== value) {
        input.value = value;
      }
    }, 200);

    // Listen for various events that might indicate autofill
    const handleInput = () => {
      if (input.value !== value && input.value !== internalValue) {
        console.log(`INPUT EVENT - AUTOFILL BLOCKED: "${input.value}" → "${value}"`);
        setTimeout(() => {
          input.value = value;
          setInternalValue(value);
        }, 0);
      }
    };

    const handleFocus = () => {
      // Delay to let autofill happen first, then override
      setTimeout(() => {
        if (input.value !== value) {
          console.log(`FOCUS EVENT - AUTOFILL BLOCKED: "${input.value}" → "${value}"`);
          input.value = value;
          setInternalValue(value);
        }
      }, 10);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleFocus);

    return () => {
      clearInterval(interval1);
      clearInterval(interval2);
      input.removeEventListener('input', handleInput);
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleFocus);
    };
  }, [value, internalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`User typing: "${newValue}"`);
    setInternalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="relative">
      {/* Multiple decoy inputs with different patterns */}
      <input
        type="text"
        name="username"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        autoComplete="username"
      />
      <input
        type="text"
        name="fname"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        autoComplete="given-name"
      />
      <input
        type="password"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        autoComplete="new-password"
      />
      
      <input
        ref={inputRef}
        id={randomId}
        name={randomName}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={internalValue}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-1p-ignore="true"
        data-bwignore="true"
        data-form-type="other"
        role="textbox"
        {...props}
      />
    </div>
  );
};

AntiAutofillInput.displayName = "AntiAutofillInput";

export { AntiAutofillInput };