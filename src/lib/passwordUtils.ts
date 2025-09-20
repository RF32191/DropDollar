export interface PasswordStrength {
  score: number; // 0-4 (0 = very weak, 4 = very strong)
  feedback: string[];
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    noCommonPatterns: boolean;
    noPersonalInfo: boolean;
  };
}

// Common weak passwords and patterns
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'iloveyou',
  'princess', 'rockyou', '12345678', 'abc123', 'nicole', 'daniel',
  'babygirl', 'monkey', 'lovely', 'jessica', 'michael', 'ashley',
  'football', 'jesus', 'robert', 'hunter', 'fuckyou', 'amanda',
  'loveme', 'soccer', 'justin', 'shadow', 'sunshine', 'melissa',
  'buster', 'tigger', 'charlie', 'george', 'harley', 'jennifer'
];

const COMMON_PATTERNS = [
  /^(.)\1+$/, // All same character (aaaa, 1111)
  /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential
  /^(qwerty|asdf|zxcv)/i, // Keyboard patterns
  /^(.{1,3})\1+$/, // Repeated patterns (abcabc, 123123)
];

export function validatePasswordStrength(
  password: string, 
  personalInfo?: { firstName?: string; lastName?: string; email?: string; username?: string }
): PasswordStrength {
  const requirements = {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    noCommonPatterns: !isCommonPattern(password),
    noPersonalInfo: !containsPersonalInfo(password, personalInfo),
  };

  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (!requirements.minLength) {
    feedback.push('Password must be at least 12 characters long');
  } else {
    score += 1;
  }

  // Check character variety
  if (!requirements.hasUppercase) {
    feedback.push('Add uppercase letters (A-Z)');
  } else {
    score += 0.5;
  }

  if (!requirements.hasLowercase) {
    feedback.push('Add lowercase letters (a-z)');
  } else {
    score += 0.5;
  }

  if (!requirements.hasNumbers) {
    feedback.push('Add numbers (0-9)');
  } else {
    score += 0.5;
  }

  if (!requirements.hasSpecialChars) {
    feedback.push('Add special characters (!@#$%^&* etc.)');
  } else {
    score += 0.5;
  }

  // Check for common patterns
  if (!requirements.noCommonPatterns) {
    feedback.push('Avoid common patterns and dictionary words');
    score -= 1;
  } else {
    score += 1;
  }

  // Check for personal information
  if (!requirements.noPersonalInfo) {
    feedback.push('Don\'t use personal information in your password');
    score -= 0.5;
  } else {
    score += 0.5;
  }

  // Bonus points for length
  if (password.length >= 16) {
    score += 0.5;
  }
  if (password.length >= 20) {
    score += 0.5;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(4, score));

  const isValid = Object.values(requirements).every(req => req) && score >= 3;

  // Generate positive feedback for strong passwords
  if (isValid && feedback.length === 0) {
    if (score >= 4) {
      feedback.push('Excellent! Your password is very strong');
    } else if (score >= 3.5) {
      feedback.push('Great! Your password is strong');
    } else {
      feedback.push('Good! Your password meets security requirements');
    }
  }

  return {
    score,
    feedback,
    isValid,
    requirements,
  };
}

function isCommonPattern(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  
  // Check against common passwords
  if (COMMON_PASSWORDS.includes(lowerPassword)) {
    return true;
  }

  // Check against common patterns
  return COMMON_PATTERNS.some(pattern => pattern.test(password));
}

function containsPersonalInfo(
  password: string, 
  personalInfo?: { firstName?: string; lastName?: string; email?: string; username?: string }
): boolean {
  if (!personalInfo) return false;

  const lowerPassword = password.toLowerCase();
  const info = [
    personalInfo.firstName?.toLowerCase(),
    personalInfo.lastName?.toLowerCase(),
    personalInfo.username?.toLowerCase(),
    personalInfo.email?.toLowerCase().split('@')[0], // Email username part
  ].filter(Boolean);

  return info.some(item => 
    item && item.length >= 3 && lowerPassword.includes(item)
  );
}

export function getPasswordStrengthColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-blue-600';
  if (score >= 2) return 'text-yellow-600';
  if (score >= 1) return 'text-orange-600';
  return 'text-red-600';
}

export function getPasswordStrengthLabel(score: number): string {
  if (score >= 4) return 'Very Strong';
  if (score >= 3) return 'Strong';
  if (score >= 2) return 'Fair';
  if (score >= 1) return 'Weak';
  return 'Very Weak';
}

export function getPasswordStrengthProgress(score: number): number {
  return Math.max(0, Math.min(100, (score / 4) * 100));
}
