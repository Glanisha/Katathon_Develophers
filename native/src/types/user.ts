// src/types/user.ts

// Define the structure of the user object retrieved from the /profile endpoint
export interface UserProfile {
  _id?: string;
  email: string;
  userType: 'salaried' | 'irregular';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  financialProfile: {
    monthlyIncome?: number;
    incomeType: 'fixed' | 'variable';
    employmentStatus?: string;
    financialGoals?: string[];
  };
  hasBankIntegration?: boolean;
}