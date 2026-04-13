import React, { useState, InputHTMLAttributes } from 'react';

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FloatingLabelInput({ label, id, value, onChange, onFocus, onBlur, ...props }: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== '';

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <div className="relative group w-full">
      <input
        {...props}
        id={id}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="block px-4 pt-6 pb-2 w-full text-base text-foreground bg-input-background rounded-xl border border-border appearance-none focus:outline-none focus:ring-4 focus:ring-input-focus focus:border-primary transition-all duration-200"
        placeholder=" "
      />
      <label
        htmlFor={id}
        className={`absolute text-sm duration-200 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 ${
          (isFocused || hasValue) 
            ? 'scale-75 -translate-y-3 text-primary' 
            : 'scale-100 translate-y-0 text-muted-foreground'
        }`}
      >
        {label}
      </label>
    </div>
  );
}
