export type UserRole = 'blood_center' | 'blood_bank' | 'blood_service_facility';

export type BloodGroup = 'A' | 'B' | 'AB' | 'O';
export type RhFactor = '+' | '-';
export type FullBloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type BloodComponentType = 
  | 'Whole Blood' 
  | 'Packed Red Blood Cells (PRBC)' 
  | 'Fresh Frozen Plasma (FFP)' 
  | 'Platelet Concentrate' 
  | 'Cryoprecipitate';

export type UnitStatus = 
  | 'Quarantine' 
  | 'Testing' 
  | 'Available' 
  | 'Crossmatched'
  | 'Uncrossmatched'
  | 'Reserved' 
  | 'In Transit' 
  | 'Transfused' 
  | 'Expired' 
  | 'Discarded';

export type RequisitionStatus = 
  | 'Pending Approval' 
  | 'Cross-Matching' 
  | 'Approved & Allocated' 
  | 'In Transit' 
  | 'Received at Facility' 
  | 'Completed' 
  | 'Cancelled' 
  | 'Rejected';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  facilityName: string;
  facilityCode: string;
  location: string;
  contactNumber: string;
  licenseNumber: string;
  avatarUrl?: string;
}

export interface BloodUnit {
  id: string; // DIN: Donation Identification Number e.g. "BC-2026-9801"
  bloodType: FullBloodType;
  component: BloodComponentType;
  volumeMl: number;
  status: UnitStatus;
  donationDate: string;
  expiryDate: string;
  testingStatus: {
    hiv: 'Negative' | 'Positive' | 'Pending';
    hbv: 'Negative' | 'Positive' | 'Pending';
    hcv: 'Negative' | 'Positive' | 'Pending';
    syphilis: 'Negative' | 'Positive' | 'Pending';
    malaria: 'Negative' | 'Positive' | 'Pending';
    overall: 'Passed' | 'Failed' | 'Testing In Progress';
  };
  currentLocation: {
    facilityId: string;
    facilityName: string;
    role: UserRole;
  };
  donorId: string;
  donorAgeGroup?: string;
  crossMatchedPatientId?: string;
  receivedFrom?: {
    requisitionId: string;
    facilityId: string;
    facilityName: string;
    role: UserRole;
    receivedAt: string;
  };
  returnDetails?: {
    returnedAt: string;
    returningFacilityId: string;
    returningFacilityName: string;
    reason: string;
  };
  notes?: string;
}

export interface RequisitionItem {
  id: string;
  requiredBloodType: FullBloodType;
  requiredComponent: BloodComponentType;
  quantityRequested: number;
  quantityProvided?: number;
  allocatedUnitIds: string[];
}

export interface RequisitionOrder {
  id: string; // e.g. "REQ-2026-0412"
  requestingFacilityId: string;
  requestingFacilityName: string;
  requestingFacilityType: 'blood_service_facility' | 'blood_bank';
  targetFacilityId: string; // Bank or Center being ordered from
  targetFacilityName: string;
  targetFacilityType?: UserRole;
  patientId?: string;
  patientName?: string;
  patientBloodType?: FullBloodType;
  diagnosisIndication?: string;
  requiredComponent?: BloodComponentType; // Optional fallback
  requiredBloodType?: FullBloodType;      // Optional fallback
  quantityRequested?: number;             // Optional fallback
  quantityProvided?: number;              // Optional fallback
  allocatedUnitIds?: string[];            // Optional fallback
  items: RequisitionItem[];               // Multi-item list
  status: RequisitionStatus;
  requestedAt: string;
  approvedAt?: string;
  fulfilledAt?: string;
  receivedAt?: string;
  requestorName: string;
  approverName?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface DonorDrive {
  id: string;
  title: string;
  location: string;
  date: string;
  targetUnits: number;
  collectedUnits: number;
  organizer: string;
  status: 'Scheduled' | 'Active Today' | 'Completed' | 'Postponed';
  registeredDonorsCount: number;
}

export interface TransfusionLog {
  id: string; // e.g. "TXN-2026-0089"
  unitId: string;
  patientId: string;
  patientName: string;
  facilityName: string;
  administeredBy: string;
  startedAt: string;
  completedAt?: string;
  adverseReaction: boolean;
  reactionDetails?: string;
  vitalSigns: {
    preTemp: number;
    postTemp?: number;
    preBP: string;
    postBP?: string;
  };
  status: 'In Progress' | 'Successfully Completed' | 'Stopped Due to Reaction';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  targetRole: UserRole | 'all';
  read: boolean;
}
