export type UserRole = 'admin' | 'tenant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  createdAt: string;
}

export type LateFeeType = 'percentage' | 'fixed';
export type PropertyStatus = 'active' | 'inactive' | 'vacant';

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  unitCount: number;
  rentAmount: number;
  rentDueDay: number;
  lateFeeType: LateFeeType;
  lateFeeAmount: number;
  gracePeriodDays: number;
  ownerId?: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt?: string;
}

export type TenantStatus = 'active' | 'inactive' | 'evicted';

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  propertyId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: number;
  securityDeposit: number;
  status: TenantStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'check' | 'ach' | 'stripe' | 'cash' | 'online';
export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  status: PaymentStatus;
  createdAt: string;
}

export type LateFeeStatus = 'active' | 'paid' | 'waived';

export interface LateFee {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  reason: string;
  status: LateFeeStatus;
  dueDate: string;
  waiverReason?: string;
  waivedBy?: string;
  waivedAt?: string;
  createdAt: string;
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';
export type MaintenanceStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
export type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'general' | 'other';

export interface MaintenanceNote {
  text: string;
  author: string;
  timestamp: string;
}

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  photos: string[];
  vendorId?: string;
  notes: MaintenanceNote[];
  submittedDate: string;
  assignedDate?: string;
  completedDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  updatedAt?: string;
}

export type VendorCategory = 'plumber' | 'electrician' | 'hvac' | 'painter' | 'contractor' | 'landscaper' | 'cleaning' | 'locksmith' | 'other';

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: VendorCategory;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  ein?: string;
  licenseNumber?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  taxId?: string;
  properties: string[];
  portalEnabled: boolean;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory = 'repairs' | 'utilities' | 'property-tax' | 'hoa' | 'legal' | 'management' | 'commission' | 'insurance' | 'other';

export interface Expense {
  id: string;
  propertyId: string;
  vendorId?: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  receiptUrl?: string;
  createdAt: string;
}

export type EscrowType = 'deposit' | 'withdrawal' | 'interest';

export interface EscrowTransaction {
  id: string;
  tenantId: string;
  propertyId: string;
  type: EscrowType;
  amount: number;
  description: string;
  reference?: string;
  approvedBy: string;
  createdAt: string;
}

export interface Document {
  id: string;
  propertyId?: string;
  tenantId?: string;
  type: 'lease' | 'receipt' | 'maintenance-report' | 'communication' | 'tax' | 'other';
  name: string;
  url: string;
  size: number;
  mimeType: string;
  description?: string;
  uploadedBy: string;
  createdAt: string;
}


