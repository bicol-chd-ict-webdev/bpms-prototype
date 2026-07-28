import { 
  UserProfile, 
  BloodUnit, 
  RequisitionOrder, 
  DonorDrive, 
  TransfusionLog, 
  NotificationItem,
  BloodComponentType,
  FullBloodType,
  UnitStatus
} from '../types/blood';
import { RHLN_FACILITIES } from './rhlnFacilityDirectory';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-center-1',
    name: 'Dr. Evelyn Vance',
    email: 'evelyn.vance@nationalblood.gov',
    role: 'blood_center',
    facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
    facilityCode: 'NBC-METRO-01',
    location: 'Central Medical District, Zone 4',
    contactNumber: '+1 (555) 019-2834',
    licenseNumber: 'BL-REG-882910',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'user-bank-1',
    name: 'Marcus Holloway, RMT',
    email: 'm.holloway@stjudehospital.org',
    role: 'blood_bank',
    facilityName: 'BICOL REGIONAL HOSPITAL AND MEDICAL CENTER',
    facilityCode: 'BB-STJUDE-04',
    location: 'North Wing, Level 2, St. Jude Medical Center',
    contactNumber: '+1 (555) 014-9981',
    licenseNumber: 'BB-LIC-441209',
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
  },
  {
    id: 'user-facility-1',
    name: 'Nurse Director Sarah Lin',
    email: 'sarah.lin@sunrisememorial.org',
    role: 'blood_service_facility',
    facilityName: 'ESTEVEZ MEMORIAL HOSPITAL INC.',
    facilityCode: 'BSF-SUNRISE-12',
    location: 'East District Trauma Unit',
    contactNumber: '+1 (555) 012-7743',
    licenseNumber: 'BSF-CERT-90812',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813566-78a0d0d82937?auto=format&fit=crop&q=80&w=150',
  }
];

const generateMockUnits = (
  bloodType: FullBloodType,
  component: BloodComponentType,
  count: number,
  startIdx: number
): BloodUnit[] => {
  const list: BloodUnit[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: `DIN-2026-X${startIdx + i}`,
      bloodType,
      component,
      volumeMl: component === 'Whole Blood' ? 450 : 250,
      status: 'Available',
      donationDate: '2026-07-20',
      expiryDate: '2026-08-31',
      testingStatus: {
        hiv: 'Negative',
        hbv: 'Negative',
        hcv: 'Negative',
        syphilis: 'Negative',
        malaria: 'Negative',
        overall: 'Passed'
      },
      currentLocation: {
        facilityId: 'NBC-METRO-01',
        facilityName: 'National Metro Blood Processing Center',
        role: 'blood_center',
      },
      donorId: `DNR-M${10000 + startIdx + i}`
    });
  }
  return list;
};

const baseUnits: BloodUnit[] = [
  {
    id: 'DIN-2026-8001',
    bloodType: 'O-',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 350,
    status: 'Available',
    donationDate: '2026-07-15',
    expiryDate: '2026-08-26',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BB-STJUDE-04',
      facilityName: 'St. Jude Regional Blood Bank',
      role: 'blood_bank',
    },
    donorId: 'DNR-99201',
    donorAgeGroup: '25-34',
    notes: 'Universal O Negative reserve unit for STAT emergency requests.'
  },
  {
    id: 'DIN-2026-8002',
    bloodType: 'O-',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 350,
    status: 'Crossmatched',
    donationDate: '2026-07-16',
    expiryDate: '2026-08-27',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BB-STJUDE-04',
      facilityName: 'St. Jude Regional Blood Bank',
      role: 'blood_bank',
    },
    donorId: 'DNR-99202',
    crossMatchedPatientId: 'PAT-4091 (Trauma Room 3)',
    notes: 'Crossmatch-compatible and held for PAT-4091 (Trauma Room 3).'
  },
  {
    id: 'DIN-2026-8003',
    bloodType: 'O+',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 380,
    status: 'Uncrossmatched',
    donationDate: '2026-07-18',
    expiryDate: '2026-08-29',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BB-STJUDE-04',
      facilityName: 'St. Jude Regional Blood Bank',
      role: 'blood_bank',
    },
    donorId: 'DNR-99205',
    receivedFrom: {
      requisitionId: 'REQ-2026-000',
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
      receivedAt: '2026-07-18 09:15'
    },
    notes: 'Unit received into blood bank inventory and awaiting crossmatch.'
  },
  {
    id: 'DIN-2026-8004',
    bloodType: 'A+',
    component: 'Fresh Frozen Plasma (FFP)',
    volumeMl: 250,
    status: 'Available',
    donationDate: '2026-07-10',
    expiryDate: '2027-07-10',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BB-STJUDE-04',
      facilityName: 'St. Jude Regional Blood Bank',
      role: 'blood_bank',
    },
    donorId: 'DNR-99310'
  },
  {
    id: 'DIN-2026-8005',
    bloodType: 'B+',
    component: 'Platelet Concentrate',
    volumeMl: 200,
    status: 'Available',
    donationDate: '2026-07-20',
    expiryDate: '2026-07-25',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BB-STJUDE-04',
      facilityName: 'St. Jude Regional Blood Bank',
      role: 'blood_bank',
    },
    donorId: 'DNR-99401',
    notes: 'Short shelf life (5 days). Priority issue.'
  },
  {
    id: 'DIN-2026-8006',
    bloodType: 'AB+',
    component: 'Cryoprecipitate',
    volumeMl: 150,
    status: 'Available',
    donationDate: '2026-07-12',
    expiryDate: '2027-07-12',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99511'
  },
  {
    id: 'DIN-2026-8007',
    bloodType: 'A-',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 340,
    status: 'In Transit',
    donationDate: '2026-07-19',
    expiryDate: '2026-08-30',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BSF-SUNRISE-12',
      facilityName: 'Sunrise Emergency Clinic',
      role: 'blood_service_facility',
    },
    donorId: 'DNR-99602',
    notes: 'Dispatched from Blood Bank in response to REQ-2026-002.'
  },
  {
    id: 'DIN-2026-8008',
    bloodType: 'B-',
    component: 'Whole Blood',
    volumeMl: 450,
    status: 'Quarantine',
    donationDate: '2026-07-21',
    expiryDate: '2026-08-25',
    testingStatus: {
      hiv: 'Pending',
      hbv: 'Pending',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Testing In Progress'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99781',
    notes: 'Raw Whole Blood donation awaiting nucleic acid testing (NAT) clearance.'
  },
  {
    id: 'DIN-2026-8011',
    bloodType: 'O+',
    component: 'Whole Blood',
    volumeMl: 450,
    status: 'Quarantine',
    donationDate: '2026-07-22',
    expiryDate: '2026-08-26',
    testingStatus: {
      hiv: 'Pending',
      hbv: 'Pending',
      hcv: 'Pending',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Testing In Progress'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99882',
    notes: 'Raw Whole Blood collection from City Hall Mobile Drive.'
  },
  {
    id: 'DIN-2026-8012',
    bloodType: 'A+',
    component: 'Whole Blood',
    volumeMl: 450,
    status: 'Quarantine',
    donationDate: '2026-07-22',
    expiryDate: '2026-08-26',
    testingStatus: {
      hiv: 'Pending',
      hbv: 'Pending',
      hcv: 'Pending',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Testing In Progress'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99883',
    notes: 'Raw Whole Blood collection from Metro Donor Station.'
  },
  {
    id: 'DIN-2026-8009',
    bloodType: 'AB-',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 320,
    status: 'Available',
    donationDate: '2026-07-14',
    expiryDate: '2026-08-25',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99812'
  },
  {
    id: 'DIN-2026-8010',
    bloodType: 'O+',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 360,
    status: 'Transfused',
    donationDate: '2026-07-01',
    expiryDate: '2026-08-12',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BSF-SUNRISE-12',
      facilityName: 'Sunrise Emergency Clinic',
      role: 'blood_service_facility',
    },
    donorId: 'DNR-99001',
    crossMatchedPatientId: 'PAT-8812 (Cardic Bypass Patient)',
    notes: 'Transfusion completed successfully. No adverse reaction.'
  },
  {
    id: 'DIN-2026-8013',
    bloodType: 'B+',
    component: 'Whole Blood',
    volumeMl: 450,
    status: 'Discarded',
    donationDate: '2026-07-20',
    expiryDate: '2026-08-31',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Positive',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Failed'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99901',
    notes: 'Tested Reactive for HBV. Flagged and removed from usable inventory stock.'
  },
  {
    id: 'DIN-2026-8014',
    bloodType: 'A-',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 330,
    status: 'Discarded',
    donationDate: '2026-07-19',
    expiryDate: '2026-08-30',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Positive',
      malaria: 'Negative',
      overall: 'Failed'
    },
    currentLocation: {
      facilityId: 'NBC-METRO-01',
      facilityName: 'National Metro Blood Processing Center',
      role: 'blood_center',
    },
    donorId: 'DNR-99902',
    notes: 'Tested Reactive for Syphilis serology. Quarantined for incineration.'
  },
  {
    id: 'DIN-2026-8015',
    bloodType: 'O-',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 320,
    status: 'Available',
    donationDate: '2026-07-18',
    expiryDate: '2026-08-28',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BSF-HARBOR-09',
      facilityName: 'Harbor Community Hospital Blood Station Facility',
      role: 'blood_service_facility',
    },
    donorId: 'DNR-99915',
    notes: 'Network-ready emergency reserve unit.'
  },
  {
    id: 'DIN-2026-8016',
    bloodType: 'A+',
    component: 'Fresh Frozen Plasma (FFP)',
    volumeMl: 250,
    status: 'Available',
    donationDate: '2026-07-16',
    expiryDate: '2027-07-16',
    testingStatus: {
      hiv: 'Negative',
      hbv: 'Negative',
      hcv: 'Negative',
      syphilis: 'Negative',
      malaria: 'Negative',
      overall: 'Passed'
    },
    currentLocation: {
      facilityId: 'BSF-HARBOR-09',
      facilityName: 'Harbor Community Hospital Blood Station Facility',
      role: 'blood_service_facility',
    },
    donorId: 'DNR-99916',
    notes: 'Network-ready plasma reserve unit.'
  }
];

type InventorySeedLocation = BloodUnit['currentLocation'] & {
  count: number;
  statusCycle: UnitStatus[];
};

const DEFAULT_ACCOUNT_FACILITY_NAMES = new Set(DEMO_USERS.map(profile => profile.facilityName.trim().toUpperCase()));

const INVENTORY_SEED_LOCATIONS: InventorySeedLocation[] = [
  {
    facilityId: 'NBC-METRO-01',
    facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
    role: 'blood_center',
    count: 1_000,
    statusCycle: ['Available', 'Available', 'Available', 'Reserved'],
  },
  {
    facilityId: 'BB-STJUDE-04',
    facilityName: 'BICOL REGIONAL HOSPITAL AND MEDICAL CENTER',
    role: 'blood_bank',
    count: 1_000,
    statusCycle: ['Available', 'Available', 'Uncrossmatched', 'Crossmatched'],
  },
  {
    facilityId: 'BSF-SUNRISE-12',
    facilityName: 'ESTEVEZ MEMORIAL HOSPITAL INC.',
    role: 'blood_service_facility',
    count: 1_000,
    statusCycle: ['Available', 'Available', 'Uncrossmatched', 'Crossmatched'],
  },
  ...RHLN_FACILITIES
    .filter(facility => !DEFAULT_ACCOUNT_FACILITY_NAMES.has(facility.name.trim().toUpperCase()))
    .map(facility => ({
      facilityId: facility.id,
      facilityName: facility.name,
      role: 'blood_service_facility' as const,
      // Five cleared units for every blood group and component, allowing the
      // directory facilities to satisfy a typical multi-unit demo request.
      count: 200,
      statusCycle: ['Available'] as UnitStatus[],
    })),
];

const INVENTORY_COMPONENTS: BloodComponentType[] = [
  'Whole Blood',
  'Packed Red Blood Cells (PRBC)',
  'Fresh Frozen Plasma (FFP)',
  'Platelet Concentrate',
  'Cryoprecipitate',
];

const INVENTORY_BLOOD_TYPES: FullBloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

const formatSeedDate = (offsetDays: number) => {
  const date = new Date(Date.UTC(2026, 6, 27));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const getInventoryVolume = (component: BloodComponentType) => {
  if (component === 'Whole Blood') return 450;
  if (component === 'Packed Red Blood Cells (PRBC)') return 350;
  if (component === 'Platelet Concentrate') return 200;
  if (component === 'Cryoprecipitate') return 150;
  return 250;
};

const generateDefaultInventoryUnits = (): BloodUnit[] => {
  let sequence = 1;

  return INVENTORY_SEED_LOCATIONS.flatMap(({ count, statusCycle, ...currentLocation }, facilityIndex) => Array.from({ length: count }, (_, index) => {
    const component = INVENTORY_COMPONENTS[index % INVENTORY_COMPONENTS.length];
    const bloodType = INVENTORY_BLOOD_TYPES[index % INVENTORY_BLOOD_TYPES.length];
    const expiryOffset = component === 'Platelet Concentrate'
      ? 1 + ((index + facilityIndex) % (5 + (facilityIndex % 4)))
      : 6 + ((index + facilityIndex * 5) % 42);
    const isCenterRedCell = currentLocation.role === 'blood_center'
      && (component === 'Whole Blood' || component === 'Packed Red Blood Cells (PRBC)');
    const unit = {
      id: `DIN-2026-${String(sequence).padStart(6, '0')}`,
      bloodType,
      component,
      volumeMl: getInventoryVolume(component),
      status: isCenterRedCell
        ? 'Available'
        : statusCycle[(index * 3 + Math.floor(index / INVENTORY_BLOOD_TYPES.length)) % statusCycle.length],
      donationDate: formatSeedDate(-14 - (index % 21)),
      expiryDate: formatSeedDate(expiryOffset),
      testingStatus: {
        hiv: 'Negative',
        hbv: 'Negative',
        hcv: 'Negative',
        syphilis: 'Negative',
        malaria: 'Negative',
        overall: 'Passed',
      },
      currentLocation,
      donorId: `DNR-${String(10_000 + sequence).padStart(6, '0')}`,
      notes: 'Default-account inventory seed. Expiry dates are staggered for FIFO release testing.',
    } satisfies BloodUnit;

    sequence += 1;
    return unit;
  }));
};

// Raw collections start empty. Demo accounts receive 1,000 units and every other
// directory facility receives a balanced 200-unit starter inventory.
export const INITIAL_BLOOD_UNITS: BloodUnit[] = generateDefaultInventoryUnits();

// Blood requests begin empty and are created through the requisition workflow.
export const INITIAL_REQUISITIONS: RequisitionOrder[] = [];

export const INITIAL_DONOR_DRIVES: DonorDrive[] = [
  {
    id: 'DRV-101',
    title: 'Metro University Campus Blood Drive',
    location: 'University Student Union Hall',
    date: '2026-07-22 (Today)',
    targetUnits: 120,
    collectedUnits: 84,
    organizer: 'Red Cross Student Chapter',
    status: 'Active Today',
    registeredDonorsCount: 110
  },
  {
    id: 'DRV-102',
    title: 'Civic Center Mobile Mobile Phlebotomy Unit',
    location: 'Downtown Plaza Parking Bay 2',
    date: '2026-07-24',
    targetUnits: 80,
    collectedUnits: 0,
    organizer: 'National Blood Center Mobile Team A',
    status: 'Scheduled',
    registeredDonorsCount: 45
  },
  {
    id: 'DRV-103',
    title: 'Tech Park Corporate Donation Event',
    location: 'Apex Towers Lobby',
    date: '2026-07-18',
    targetUnits: 150,
    collectedUnits: 162,
    organizer: 'National Blood Center & Apex Corp',
    status: 'Completed',
    registeredDonorsCount: 170
  }
];

export const INITIAL_TRANSFUSION_LOGS: TransfusionLog[] = [
  {
    id: 'TXN-2026-0089',
    unitId: 'DIN-2026-8010',
    patientId: 'PAT-8812',
    patientName: 'Robert Garcia',
    facilityName: 'ESTEVEZ MEMORIAL HOSPITAL INC.',
    administeredBy: 'Nurse S. Lin, RN',
    startedAt: '2026-07-21 14:15',
    completedAt: '2026-07-21 16:30',
    adverseReaction: false,
    vitalSigns: {
      preTemp: 36.8,
      postTemp: 37.1,
      preBP: '120/80',
      postBP: '124/82'
    },
    status: 'Successfully Completed'
  },
  {
    id: 'TXN-2026-0090',
    unitId: 'DIN-2026-8007',
    patientId: 'PAT-3302',
    patientName: 'Elena Rostova',
    facilityName: 'ESTEVEZ MEMORIAL HOSPITAL INC.',
    administeredBy: 'Nurse Chen, RN',
    startedAt: '2026-07-22 05:00',
    adverseReaction: false,
    vitalSigns: {
      preTemp: 37.0,
      preBP: '108/70'
    },
    status: 'In Progress'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NOTIF-1',
    title: 'CRITICAL: Low O- PRBC Stock Warning',
    message: 'Universal O Negative stock at St. Jude Blood Bank has dropped below critical threshold (2 units).',
    timestamp: '10 mins ago',
    type: 'critical',
    targetRole: 'all',
    read: false
  },
  {
    id: 'NOTIF-2',
    title: 'New Emergency STAT Requisition',
    message: 'Requisition REQ-2026-001 submitted by ESTEVEZ MEMORIAL HOSPITAL INC. for Trauma Patient PAT-4091.',
    timestamp: '25 mins ago',
    type: 'warning',
    targetRole: 'blood_bank',
    read: false
  },
  {
    id: 'NOTIF-3',
    title: 'Lab Clearance Certificate Ready',
    message: 'Batch #B-9912 passed 100% viral marker screening (HIV, HBV, HCV, Syphilis) at Metro Center.',
    timestamp: '1 hour ago',
    type: 'success',
    targetRole: 'blood_center',
    read: true
  }
];
