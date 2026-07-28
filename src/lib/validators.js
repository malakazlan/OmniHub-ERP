export function isRequired(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return `${fieldName} is required`;
  }
  return null;
}

export function isValidEmail(email) {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) ? null : "Invalid email address";
}

export function isValidPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return "Phone number must be 10-15 digits";
  }
  return null;
}

export function isPositiveNumber(value, fieldName) {
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
}

export function validateFields(fields) {
  const errors = {};
  for (const [key, { value, rules }] of Object.entries(fields)) {
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        errors[key] = error;
        break;
      }
    }
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeString(str) {
  if (str === null || str === undefined) return null;
  const trimmed = String(str).trim();
  return trimmed === "" ? null : trimmed;
}
