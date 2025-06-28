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
  const [randomId] = useState(() => `input_${Math.random().toString(36).substr(2, 9)}`);
  
  // Sync external value changes
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value, internalValue]);

  // Monitor for unauthorized changes (autofill detection)
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // Also check periodically
    const interval = setInterval(() => {
      if (input.value !== internalValue && input.value !== value) {
        console.log(`Periodic check: Autofill detected! Reverting from "${input.value}" to "${value}"`);
        input.value = value;
        setInternalValue(value);
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [internalValue, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="relative">
      {/* Decoy input to confuse autofill */}
      <input
        type="text"
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          opacity: 0, 
          pointerEvents: 'none' 
        }}
        tabIndex={-1}
        autoComplete="new-password"
      />
      
      <input
        ref={inputRef}
        id={randomId}
        name={randomId}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={internalValue}
        onChange={handleChange}
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        {...props}
      />
    </div>
  );
};

AntiAutofillInput.displayName = "AntiAutofillInput";

export { AntiAutofillInput };