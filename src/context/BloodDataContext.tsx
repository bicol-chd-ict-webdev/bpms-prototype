import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
 BloodUnit, 
 RequisitionOrder, 
 DonorDrive, 
 TransfusionLog, 
 NotificationItem,
 RequisitionStatus,
 UnitStatus,
 FullBloodType,
 BloodComponentType
} from '../types/blood';
import { 
 INITIAL_BLOOD_UNITS, 
 INITIAL_REQUISITIONS, 
 INITIAL_DONOR_DRIVES, 
 INITIAL_TRANSFUSION_LOGS, 
 INITIAL_NOTIFICATIONS 
} from '../data/mockData';
import { prioritizeUnitsForRelease } from '../lib/bloodRelease';
import { calculateExpiryFromCollectionDate } from '../lib/bloodExpiry';
import { formatReturnReasons, hasValidReturnReasons, ReturnReason } from '../lib/bloodReturn';
import { toast } from 'sonner';

interface BloodDataContextType {
 bloodUnits: BloodUnit[];
 networkInventoryLastUpdated: string;
 requisitions: RequisitionOrder[];
 donorDrives: DonorDrive[];
 transfusionLogs: TransfusionLog[];
 notifications: NotificationItem[];
 addRequisition: (req: Omit<RequisitionOrder, 'id' | 'requestedAt' | 'status'>) => boolean;
 updateRequisitionStatus: (id: string, status: RequisitionStatus, notes?: string, allocatedUnitIds?: string[], quantityProvided?: number, updatedItems?: { id: string; quantityProvided?: number; allocatedUnitIds: string[] }[]) => void;
 receiveBloodRequest: (reqId: string) => void;
 returnBloodUnit: (unitId: string, returningFacilityId: string, returningFacilityName: string, reasons: ReturnReason[]) => boolean;
 returnBloodUnits: (unitIds: string[], returningFacilityId: string, returningFacilityName: string, reasons: ReturnReason[]) => boolean;
 addBloodUnit: (unit: Omit<BloodUnit, 'id'>) => void;
 addBatchBloodUnits: (units: BloodUnit[]) => void;
 updateUnitStatus: (id: string, status: UnitStatus, locationNotes?: string, suppressToast?: boolean) => void;
 addTransfusionLog: (log: Omit<TransfusionLog, 'id' | 'startedAt'>) => void;
 updateTransfusionLog: (id: string, updates: Partial<TransfusionLog>) => void;
 addDonorDrive: (drive: Omit<DonorDrive, 'id' | 'collectedUnits'>) => void;
 processUnitForInventory: (processedData: Partial<BloodUnit> & {
 bloodType: FullBloodType;
 component: BloodComponentType;
 volumeMl: number;
 testingStatus: BloodUnit['testingStatus'];
 }) => void;
 bulkProcessInventory: (items: {
 id?: string;
 bloodType: FullBloodType;
 component: BloodComponentType;
 volumeMl: number;
 isNonReactive: boolean;
 donorId?: string;
 }[]) => void;
 markNotificationRead: (id: string) => void;
 clearAllNotifications: () => void;
}

const BloodDataContext = createContext<BloodDataContextType | undefined>(undefined);

export const BloodDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const [bloodUnits, setBloodUnits] = useState<BloodUnit[]>(INITIAL_BLOOD_UNITS);
 const [networkInventoryLastUpdated, setNetworkInventoryLastUpdated] = useState(() => new Date().toISOString());
 const [requisitions, setRequisitions] = useState<RequisitionOrder[]>(INITIAL_REQUISITIONS);
 const [donorDrives, setDonorDrives] = useState<DonorDrive[]>(INITIAL_DONOR_DRIVES);
 const [transfusionLogs, setTransfusionLogs] = useState<TransfusionLog[]>(INITIAL_TRANSFUSION_LOGS);
 const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

 // Every inventory mutation updates the network view in the same shared data store.
 useEffect(() => {
 setNetworkInventoryLastUpdated(new Date().toISOString());
 }, [bloodUnits]);

 const addRequisition = (reqData: Omit<RequisitionOrder, 'id' | 'requestedAt' | 'status'>) => {
 const targetReportsInventory = bloodUnits.some(unit => unit.currentLocation.facilityId === reqData.targetFacilityId);
 // Select and reserve the exact units when a networked facility receives a
 // request. Reserved units are no longer counted as available by any facility.
 const reservationIdsByItem = new Map<string, string[]>();
 const claimedUnitIds = new Set<string>();
 if (targetReportsInventory) {
 for (const item of reqData.items) {
 const unitsToReserve = prioritizeUnitsForRelease(bloodUnits.filter(unit =>
 unit.currentLocation.facilityId === reqData.targetFacilityId &&
 unit.bloodType === item.requiredBloodType &&
 unit.component === item.requiredComponent &&
 unit.status === 'Available' &&
 unit.testingStatus.overall === 'Passed' &&
 !claimedUnitIds.has(unit.id)
 )).slice(0, item.quantityRequested);

 // Stock may have changed after the request form was opened.
 if (unitsToReserve.length < item.quantityRequested) {
 toast.error('Request could not be submitted', {
 description: 'Available inventory changed before this request was submitted. Review the selected quantities and try again.',
 });
 return false;
 }
 reservationIdsByItem.set(item.id, unitsToReserve.map(unit => unit.id));
 unitsToReserve.forEach(unit => claimedUnitIds.add(unit.id));
 }
 }

 const requisitionItems = reqData.items.map(item => ({
 ...item,
 allocatedUnitIds: reservationIdsByItem.get(item.id) || item.allocatedUnitIds,
 }));
 const reservedUnitIds = requisitionItems.flatMap(item => item.allocatedUnitIds);

 const newReq: RequisitionOrder = {
 ...reqData,
 id: `REQ-2026-${String(requisitions.length + 1).padStart(3, '0')}`,
 requestedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
 status: 'Pending Approval',
 allocatedUnitIds: reservedUnitIds,
 items: requisitionItems,
 };

 if (reservedUnitIds.length > 0) {
 setBloodUnits(previous => previous.map(unit => reservedUnitIds.includes(unit.id)
 ? { ...unit, status: 'Reserved' }
 : unit
 ));
 }
 setRequisitions(prev => [newReq, ...prev]);

 // Add notification — target the receiving facility's role
 const isFromBank = reqData.requestingFacilityType === 'blood_bank';
 const itemsDescription = newReq.items ? newReq.items.map(it => `${it.quantityRequested}x ${it.requiredBloodType} ${it.requiredComponent.split('(')[0]}`).join(', ') : '';
 const newNotif: NotificationItem = {
 id: `NOTIF-${Date.now()}`,
 title: `New Blood Request ${newReq.id}`,
 message: `${newReq.requestingFacilityName} requested: ${itemsDescription || 'Blood products'}.`,
 timestamp: 'Just now',
 type: 'warning',
 targetRole: reqData.targetFacilityType || (isFromBank ? 'blood_center' : 'blood_bank'),
 read: false
 };
 setNotifications(prev => [newNotif, ...prev]);
 toast.success('Blood request submitted', {
 description: `${newReq.items.length} product type${newReq.items.length === 1 ? '' : 's'} added to requisition ${newReq.id}.`,
 });
 return true;
 };

 const updateRequisitionStatus = (
 id: string, 
 status: RequisitionStatus, 
 notes?: string, 
 allocatedUnitIds?: string[],
 quantityProvided?: number,
 updatedItems?: { id: string; quantityProvided?: number; allocatedUnitIds: string[] }[]
 ) => {
 const currentRequest = requisitions.find(req => req.id === id);
 setRequisitions(prev => prev.map(req => {
 if (req.id === id) {
 const updated = { ...req, status };
 if (notes) updated.notes = notes;
 if (allocatedUnitIds) updated.allocatedUnitIds = allocatedUnitIds;
 if (quantityProvided !== undefined) updated.quantityProvided = quantityProvided;

 // If specific item updates are passed, apply them to the items array
 if (updatedItems && updatedItems.length > 0) {
 updated.items = req.items.map(item => {
 const up = updatedItems.find(u => u.id === item.id);
 if (up) {
 return {
 ...item,
 quantityProvided: up.quantityProvided !== undefined ? up.quantityProvided : item.quantityProvided,
 allocatedUnitIds: up.allocatedUnitIds || item.allocatedUnitIds
 };
 }
 return item;
 });
 updated.allocatedUnitIds = updated.items.flatMap(item => item.allocatedUnitIds);
 }

 const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
 if (status === 'Cross-Matching' || status === 'Approved & Allocated') updated.approvedAt = now;
 if (status === 'In Transit') updated.fulfilledAt = now;
 if (status === 'Received at Facility' || status === 'Completed') updated.receivedAt = now;

 return updated;
 }
 return req;
 }));

 // If allocated units (either global or per-item), update blood unit statuses automatically
 let allAllocatedIds: string[] = [];
 if (allocatedUnitIds) allAllocatedIds = [...allAllocatedIds, ...allocatedUnitIds];
 if (updatedItems) {
 updatedItems.forEach(item => {
 if (item.allocatedUnitIds) {
 allAllocatedIds = [...allAllocatedIds, ...item.allocatedUnitIds];
 }
 });
 }

 const previouslyReservedIds = currentRequest
 ? currentRequest.items.flatMap(item => item.allocatedUnitIds)
 : [];
 const releasedUnitIds = status === 'In Transit'
 ? previouslyReservedIds.filter(unitId => !allAllocatedIds.includes(unitId))
 : ['Cancelled', 'Rejected'].includes(status)
 ? previouslyReservedIds
 : [];

 if (allAllocatedIds.length > 0 || releasedUnitIds.length > 0) {
 setBloodUnits(prev => prev.map(unit => {
 if (allAllocatedIds.includes(unit.id)) {
 let newUnitStatus: UnitStatus = unit.status;
 if (status === 'Approved & Allocated' || status === 'Cross-Matching') newUnitStatus = 'Reserved';
 if (status === 'In Transit') newUnitStatus = 'In Transit';
 if (status === 'Received at Facility') newUnitStatus = 'Available';
 if (status === 'Completed') newUnitStatus = 'Transfused';
 return { ...unit, status: newUnitStatus };
 }
 if (releasedUnitIds.includes(unit.id) && unit.status === 'Reserved') return { ...unit, status: 'Available' };
 return unit;
 }));
 }
 toast.success(`Requisition ${status}`, {
 description: currentRequest ? `${currentRequest.id} was updated successfully.` : 'The requisition status was updated successfully.',
 });
 };

 // The requesting facility accepts a delivered request. Accepted units are then saved to its inventory.
 const receiveBloodRequest = (reqId: string) => {
 const req = requisitions.find(r => r.id === reqId);
 if (!req || req.status !== 'In Transit') return;

 let totalTransferredCount = 0;
 const receivedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

 setBloodUnits(prev => {
 let updatedUnits = [...prev];

 req.items.forEach(item => {
 const providedCount = item.quantityProvided !== undefined ? item.quantityProvided : item.quantityRequested;
 totalTransferredCount += providedCount;

 // Transfer matching cleared units from the facility selected on the request.
 const sourceUnits = updatedUnits.filter(u =>
 u.bloodType === item.requiredBloodType &&
 u.component === item.requiredComponent &&
 u.testingStatus.overall === 'Passed' &&
 u.currentLocation.facilityId === req.targetFacilityId &&
 (u.status === 'Available' || u.status === 'In Transit' || u.status === 'Reserved')
 );

 const unitsToTransfer = item.allocatedUnitIds.length > 0
 ? item.allocatedUnitIds
 .map(unitId => sourceUnits.find(unit => unit.id === unitId))
 .filter((unit): unit is BloodUnit => Boolean(unit))
 .slice(0, providedCount)
 : prioritizeUnitsForRelease(sourceUnits).slice(0, providedCount);
 const remaining = providedCount - unitsToTransfer.length;

 // Accepted units become available in the requesting facility inventory.
 if (unitsToTransfer.length > 0) {
 const transferIds = unitsToTransfer.map(u => u.id);
 updatedUnits = updatedUnits.map(unit => {
 if (transferIds.includes(unit.id)) {
 return {
 ...unit,
 status: 'Available' as UnitStatus,
 currentLocation: {
 facilityId: req.requestingFacilityId,
 facilityName: req.requestingFacilityName,
 role: req.requestingFacilityType,
 },
 receivedFrom: {
 requisitionId: req.id,
 facilityId: req.targetFacilityId,
 facilityName: req.targetFacilityName,
 role: req.targetFacilityType || unit.currentLocation.role,
 receivedAt,
 },
 };
 }
 return unit;
 });
 }

 // Generate remaining accepted units for prototype inventory when source records are not represented.
 if (remaining > 0) {
 const newUnits: BloodUnit[] = [];
 for (let i = 0; i < remaining; i++) {
 newUnits.push({
 id: `DIN-2026-${Math.floor(9000 + Math.random() * 999)}-${item.id}-${i}`,
 bloodType: item.requiredBloodType,
 component: item.requiredComponent,
 volumeMl: item.requiredComponent === 'Whole Blood' ? 450 : 280,
 status: 'Available',
 donationDate: new Date().toISOString().split('T')[0],
 expiryDate: calculateExpiryFromCollectionDate(item.requiredComponent, new Date().toISOString().split('T')[0]),
 testingStatus: {
 hiv: 'Negative', hbv: 'Negative', hcv: 'Negative',
 syphilis: 'Negative', malaria: 'Negative', overall: 'Passed'
 },
 currentLocation: {
 facilityId: req.requestingFacilityId,
 facilityName: req.requestingFacilityName,
 role: req.requestingFacilityType,
 },
 receivedFrom: {
 requisitionId: req.id,
 facilityId: req.targetFacilityId,
 facilityName: req.targetFacilityName,
 role: req.targetFacilityType || 'blood_center',
 receivedAt,
 },
 donorId: `DNR-${Math.floor(10000 + Math.random() * 90000)}`,
 notes: `Accepted into inventory via request ${reqId}.`
 });
 }
 updatedUnits = [...newUnits, ...updatedUnits];
 }
 });

 return updatedUnits;
 });

 // Update the requisition status to received
 updateRequisitionStatus(reqId, 'Received at Facility', `Accepted ${totalTransferredCount} unit(s) into ${req.requestingFacilityName} inventory.`);

 // Notification for the requesting facility
 const recvNotif: NotificationItem = {
 id: `NOTIF-${Date.now()}`,
 title: `Blood Received: ${reqId}`,
 message: `${totalTransferredCount} unit(s) have been added to your inventory.`,
 timestamp: 'Just now',
 type: 'success',
 targetRole: req.requestingFacilityType,
 read: false
 };
 setNotifications(prev => [recvNotif, ...prev]);
 };

 const returnBloodUnits = (unitIds: string[], returningFacilityId: string, returningFacilityName: string, reasons: ReturnReason[]) => {
 const units = bloodUnits.filter(item => unitIds.includes(item.id));
 const origin = units[0]?.receivedFrom;
 const canReturn = Boolean(
 units.length === unitIds.length &&
 unitIds.length > 0 &&
 origin &&
 units.every(unit =>
 unit.receivedFrom?.facilityId === origin.facilityId &&
 unit.currentLocation.facilityId === returningFacilityId &&
 ['Available', 'Uncrossmatched'].includes(unit.status)
 ) &&
 hasValidReturnReasons(reasons)
 );

 if (!origin || !canReturn) return false;

 const returnedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
 const reason = formatReturnReasons(reasons);
 setBloodUnits(previous => previous.map(item => unitIds.includes(item.id) ? {
 ...item,
 status: 'Available',
 currentLocation: {
 facilityId: origin.facilityId,
 facilityName: origin.facilityName,
 role: origin.role,
 },
 returnDetails: {
 returnedAt,
 returningFacilityId,
 returningFacilityName,
 reason: reason.trim(),
 },
 notes: `${item.notes ? `${item.notes} ` : ''}Returned to original source ${origin.facilityName} from ${returningFacilityName}. Reason: ${reason.trim()}`,
 } : item));

 setNotifications(previous => [{
 id: `NOTIF-${Date.now()}`,
 title: `${unitIds.length} Blood Unit${unitIds.length === 1 ? '' : 's'} Returned`,
 message: `${returningFacilityName} returned ${unitIds.length} unit${unitIds.length === 1 ? '' : 's'} to ${origin.facilityName}.`,
 timestamp: 'Just now',
 type: 'info',
 targetRole: origin.role,
 read: false,
 }, ...previous]);

 toast.success('Blood units returned', {
 description: `${unitIds.length} unit${unitIds.length === 1 ? '' : 's'} returned to ${origin.facilityName}.`,
 });

 return true;
 };

 const returnBloodUnit = (unitId: string, returningFacilityId: string, returningFacilityName: string, reasons: ReturnReason[]) =>
 returnBloodUnits([unitId], returningFacilityId, returningFacilityName, reasons);

 const addBloodUnit = (unitData: Omit<BloodUnit, 'id'>) => {
 const newUnit: BloodUnit = {
 ...unitData,
 id: `DIN-2026-${Math.floor(8000 + Math.random() * 1000)}`
 };
 setBloodUnits(prev => [newUnit, ...prev]);
 toast.success('Blood collection registered', {
 description: `${newUnit.id} is now pending laboratory screening.`,
 });
 };

 const addBatchBloodUnits = (newUnits: BloodUnit[]) => {
 setBloodUnits(prev => [...newUnits, ...prev]);

 // Add notification
 const newNotif: NotificationItem = {
 id: `NOTIF-${Date.now()}`,
 title: `Batch Collection Upload: ${newUnits.length} Units`,
 message: `Successfully registered ${newUnits.length} blood collection records via Excel upload.`,
 timestamp: 'Just now',
 type: 'info',
 targetRole: 'blood_center',
 read: false
 };
 setNotifications(prev => [newNotif, ...prev]);
 toast.success('Collection batch imported', {
 description: `${newUnits.length} blood unit${newUnits.length === 1 ? '' : 's'} added to the screening queue.`,
 });
 };

 const updateUnitStatus = (id: string, status: UnitStatus, locationNotes?: string, suppressToast = false) => {
 setBloodUnits(prev => prev.map(u => {
 if (u.id === id) {
 const updated = { ...u, status };
 if (locationNotes) {
 updated.notes = locationNotes;
 }
 return updated;
 }
 return u;
 }));
 if (!suppressToast) {
 toast.success('Blood unit status updated', {
 description: `${id} is now marked as ${status}.`,
 });
 }
 };

 const addTransfusionLog = (logData: Omit<TransfusionLog, 'id' | 'startedAt'>) => {
 const newLog: TransfusionLog = {
 ...logData,
 id: `TXN-2026-${String(transfusionLogs.length + 1).padStart(4, '0')}`,
 startedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
 };
 setTransfusionLogs(prev => [newLog, ...prev]);

 // Mark corresponding unit as transfused
 updateUnitStatus(logData.unitId, 'Transfused', undefined, true);
 toast.success('Transfusion started', {
 description: `Transfusion record ${newLog.id} has been created.`,
 });
 };

 const updateTransfusionLog = (id: string, updates: Partial<TransfusionLog>) => {
 setTransfusionLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
 toast.success('Transfusion record updated', {
 description: updates.status === 'Successfully Completed' ? 'The transfusion was completed successfully.' : `Record ${id} has been updated.`,
 });
 };

 const addDonorDrive = (driveData: Omit<DonorDrive, 'id' | 'collectedUnits'>) => {
 const newDrive: DonorDrive = {
 ...driveData,
 id: `DRV-${Math.floor(100 + Math.random() * 900)}`,
 collectedUnits: 0
 };
 setDonorDrives(prev => [newDrive, ...prev]);
 toast.success('Donor drive created', {
 description: `${newDrive.title} is now scheduled.`,
 });
 };

 const processUnitForInventory = (processedData: Partial<BloodUnit> & {
 bloodType: FullBloodType;
 component: BloodComponentType;
 volumeMl: number;
 testingStatus: BloodUnit['testingStatus'];
 }) => {
 const isPassed = processedData.testingStatus.overall === 'Passed';
 const finalStatus: UnitStatus = isPassed ? 'Available' : 'Discarded';
 
 let targetId = processedData.id;
 if (!targetId) {
 targetId = `DIN-2026-${Math.floor(8000 + Math.random() * 1000)}`;
 }

 setBloodUnits(prev => {
 const existingIndex = prev.findIndex(u => u.id === targetId);
 if (existingIndex >= 0) {
 const updatedList = [...prev];
 const current = updatedList[existingIndex];
 const donationDate = processedData.donationDate || current.donationDate;
 updatedList[existingIndex] = {
 ...current,
 ...processedData,
 id: targetId!,
 status: finalStatus,
 donationDate,
 expiryDate: isPassed ? calculateExpiryFromCollectionDate(processedData.component, donationDate) : '',
 currentLocation: {
 facilityId: current.currentLocation?.facilityId || 'NBC-METRO-01',
 facilityName: current.currentLocation?.facilityName || 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: current.currentLocation?.role || 'blood_center',
 }
 };
 return updatedList;
 } else {
 const donationDate = processedData.donationDate || new Date().toISOString().split('T')[0];
 const newUnit: BloodUnit = {
 id: targetId!,
 bloodType: processedData.bloodType,
 component: processedData.component,
 volumeMl: processedData.volumeMl,
 status: finalStatus,
 donationDate,
 expiryDate: isPassed ? calculateExpiryFromCollectionDate(processedData.component, donationDate) : '',
 testingStatus: processedData.testingStatus,
 currentLocation: {
 facilityId: 'NBC-METRO-01',
 facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: 'blood_center',
 },
 donorId: processedData.donorId || `DNR-${Math.floor(10000 + Math.random() * 90000)}`,
 notes: processedData.notes || (isPassed ? 'Tested Non-Reactive & added to inventory stock.' : 'Tested REACTIVE. Flagged for quarantine & disposal.')
 };
 return [newUnit, ...prev];
 }
 });

 const newNotif: NotificationItem = {
 id: `NOTIF-${Date.now()}`,
 title: isPassed ? `Inventory Unit Cleared: ${targetId}` : `Reactive Unit Flagged: ${targetId}`,
 message: isPassed 
 ? `Unit ${targetId} (${processedData.bloodType} ${processedData.component}) passed all screening and was added to available inventory.`
 : `Unit ${targetId} tested REACTIVE and was safely routed to quarantine discard vault.`,
 timestamp: 'Just now',
 type: isPassed ? 'success' : 'critical',
 targetRole: 'blood_center',
 read: false
 };
 setNotifications(prev => [newNotif, ...prev]);
 if (isPassed) {
 toast.success('Blood unit cleared to inventory', {
 description: `${targetId} passed screening and is now available.`,
 });
 } else {
 toast.warning('Reactive blood unit quarantined', {
 description: `${targetId} failed screening and was routed for disposal.`,
 });
 }
 };

 const bulkProcessInventory = (items: {
 id?: string;
 bloodType: FullBloodType;
 component: BloodComponentType;
 volumeMl: number;
 isNonReactive: boolean;
 donorId?: string;
 }[]) => {
 let clearedCount = 0;
 let discardedCount = 0;

 setBloodUnits(prev => {
 const updated = [...prev];

 items.forEach((item, idx) => {
 const isPassed = item.isNonReactive;
 if (isPassed) clearedCount++;
 else discardedCount++;

 const finalStatus: UnitStatus = isPassed ? 'Available' : 'Discarded';
 const targetId = item.id || `DIN-2026-${Math.floor(8100 + Math.random() * 800) + idx}`;

 const testingStatus: BloodUnit['testingStatus'] = {
 hiv: 'Negative',
 hbv: isPassed ? 'Negative' : 'Positive',
 hcv: 'Negative',
 syphilis: 'Negative',
 malaria: 'Negative',
 overall: isPassed ? 'Passed' : 'Failed'
 };

 const existingIdx = updated.findIndex(u => u.id === targetId);
 if (existingIdx >= 0) {
 const donationDate = updated[existingIdx].donationDate;
 updated[existingIdx] = {
 ...updated[existingIdx],
 bloodType: item.bloodType,
 component: item.component,
 volumeMl: item.volumeMl,
 status: finalStatus,
 expiryDate: isPassed ? calculateExpiryFromCollectionDate(item.component, donationDate) : '',
 testingStatus,
 currentLocation: {
 facilityId: 'NBC-METRO-01',
 facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: 'blood_center',
 },
 notes: isPassed ? 'Batch process: Tested Non-Reactive & added to inventory.' : 'Batch process: Tested REACTIVE (HBV+). Flagged & discarded.'
 };
 } else {
 const donationDate = new Date().toISOString().split('T')[0];
 updated.unshift({
 id: targetId,
 bloodType: item.bloodType,
 component: item.component,
 volumeMl: item.volumeMl,
 status: finalStatus,
 donationDate,
 expiryDate: isPassed ? calculateExpiryFromCollectionDate(item.component, donationDate) : '',
 testingStatus,
 currentLocation: {
 facilityId: 'NBC-METRO-01',
 facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: 'blood_center',
 },
 donorId: item.donorId || `DNR-${Math.floor(10000 + Math.random() * 90000)}`,
 notes: isPassed ? 'Batch process: Tested Non-Reactive & added to inventory.' : 'Batch process: Tested REACTIVE (HBV+). Flagged & discarded.'
 });
 }
 });

 return updated;
 });

 const batchNotif: NotificationItem = {
 id: `NOTIF-${Date.now()}`,
 title: `Bulk Inventory Processed (${items.length} Units)`,
 message: `Batch testing complete: ${clearedCount} Non-Reactive units cleared to available stock, ${discardedCount} Reactive units flagged and discarded.`,
 timestamp: 'Just now',
 type: discardedCount > 0 ? 'warning' : 'success',
 targetRole: 'blood_center',
 read: false
 };
 setNotifications(prev => [batchNotif, ...prev]);
 if (discardedCount > 0) {
 toast.warning('Batch screening completed', {
 description: `${clearedCount} unit${clearedCount === 1 ? '' : 's'} cleared and ${discardedCount} flagged for discard.`,
 });
 } else {
 toast.success('Batch screening completed', {
 description: `${clearedCount} unit${clearedCount === 1 ? '' : 's'} cleared to inventory.`,
 });
 }
 };

 const markNotificationRead = (id: string) => {
 setNotifications(prev => prev.map(n => n.id === id ? { ...readNotification(n) } : n));
 };

 const readNotification = (n: NotificationItem): NotificationItem => ({ ...n, read: true });

 const clearAllNotifications = () => {
 setNotifications(prev => prev.map(n => ({ ...n, read: true })));
 };

 return (
 <BloodDataContext.Provider value={{
 bloodUnits,
 networkInventoryLastUpdated,
 requisitions,
 donorDrives,
 transfusionLogs,
 notifications,
 addRequisition,
 updateRequisitionStatus,
 receiveBloodRequest,
 returnBloodUnit,
 returnBloodUnits,
 addBloodUnit,
 addBatchBloodUnits,
 updateUnitStatus,
 addTransfusionLog,
 updateTransfusionLog,
 addDonorDrive,
 processUnitForInventory,
 bulkProcessInventory,
 markNotificationRead,
 clearAllNotifications
 }}>
 {children}
 </BloodDataContext.Provider>
 );
};

export const useBloodData = () => {
 const context = useContext(BloodDataContext);
 if (!context) {
 throw new Error('useBloodData must be used within a BloodDataProvider');
 }
 return context;
};
