import { type InputHTMLAttributes, forwardRef } from "react";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  type?: "text" | "email" | "password" | "number";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, id, className = "", type = "text", ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          className={`
            block w-full rounded-lg border px-4 py-3 text-base text-gray-900
            placeholder-gray-400 transition-colors
            focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623] focus:outline-none
            ${error ? "border-red-500" : "border-gray-300"}
            ${className}
          `.trim()}
          {...props}
        />
        {error && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
