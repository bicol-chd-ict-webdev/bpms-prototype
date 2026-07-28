import { Button } from '../ui/button';
import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { X, Droplet, Send, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { FullBloodType, BloodComponentType, RequisitionItem } from '../../types/blood';
import { getBloodComponentStockLevel } from '../../lib/bloodStockLevel';

interface BloodRequestModalProps {
 isOpen: boolean;
 onClose: () => void;
}

interface TempRequestItem {
 bloodType: FullBloodType;
 component: BloodComponentType;
 quantity: number;
}

const BLOOD_GROUPS: FullBloodType[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
const COMPONENTS: BloodComponentType[] = [
 'Packed Red Blood Cells (PRBC)',
 'Whole Blood',
 'Fresh Frozen Plasma (FFP)',
 'Platelet Concentrate',
 'Cryoprecipitate'
];
const COMPONENT_SHORT: Record<BloodComponentType, string> = {
 'Packed Red Blood Cells (PRBC)': 'PRBC',
 'Whole Blood': 'Whole Blood',
 'Fresh Frozen Plasma (FFP)': 'FFP',
 'Platelet Concentrate': 'Platelets',
 'Cryoprecipitate': 'Cryo'
};

export const BloodRequestModal: React.FC<BloodRequestModalProps> = ({ 
 isOpen, 
 onClose 
}) => {
 const { user } = useAuth();
 const { addRequisition, bloodUnits } = useBloodData();

 const [items, setItems] = useState<TempRequestItem[]>([]);
 const [selectedProduct, setSelectedProduct] = useState<{
 bloodType: FullBloodType;
 component: BloodComponentType;
 } | null>(null);
 const [quantity, setQuantity] = useState<number>(1);

 // Helper: get center stock for a given group + component
 const getCenterStock = (g: FullBloodType, c: BloodComponentType) =>
 bloodUnits.filter(u =>
 u.bloodType === g &&
 u.component === c &&
 u.status === 'Available' &&
 u.currentLocation.role === 'blood_center' &&
 u.testingStatus.overall === 'Passed'
 ).length;

 const getCenterComponentStockLevel = (bloodType: FullBloodType, component: BloodComponentType) => getBloodComponentStockLevel(
 bloodType,
 component,
 getCenterStock(bloodType, component),
 );

 const selectedStock = selectedProduct
 ? getCenterStock(selectedProduct.bloodType, selectedProduct.component)
 : 0;
 const queuedQuantity = selectedProduct
 ? items.find(item =>
 item.bloodType === selectedProduct.bloodType &&
 item.component === selectedProduct.component
 )?.quantity || 0
 : 0;
 const requestableCount = selectedProduct && getCenterComponentStockLevel(selectedProduct.bloodType, selectedProduct.component) === 'critical'
 ? 0
 : Math.max(selectedStock - queuedQuantity, 0);

 useEffect(() => {
 if (!selectedProduct) return;

 setQuantity(requestableCount > 0 ? 1 : 0);
 }, [selectedProduct, requestableCount]);

 if (!isOpen) return null;

 const handleSelectProduct = (bloodType: FullBloodType, component: BloodComponentType, stock: number) => {
 if (stock === 0 || getCenterComponentStockLevel(bloodType, component) === 'critical') return;

 setSelectedProduct({ bloodType, component });
 };

 const handleAddItem = () => {
 if (!selectedProduct || getCenterComponentStockLevel(selectedProduct.bloodType, selectedProduct.component) === 'critical' || quantity <= 0 || quantity > requestableCount) return;

 const { bloodType, component } = selectedProduct;
 const existingIndex = items.findIndex(item => item.bloodType === bloodType && item.component === component);
 if (existingIndex >= 0) {
 const updated = [...items];
 updated[existingIndex].quantity += quantity;
 setItems(updated);
 } else {
 setItems([...items, { bloodType, component, quantity }]);
 }
 setSelectedProduct(null);
 setQuantity(1);
 };

 const handleRemoveItem = (index: number) => {
 setItems(items.filter((_, i) => i !== index));
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (items.length === 0) return;

 const requisitionItems: RequisitionItem[] = items.map((it, idx) => ({
 id: `REQ-ITEM-${Date.now()}-${idx}`,
 requiredBloodType: it.bloodType,
 requiredComponent: it.component,
 quantityRequested: it.quantity,
 allocatedUnitIds: []
 }));

 const firstItem = items[0];
 const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);

 if (addRequisition({
 requestingFacilityId: user?.facilityCode || 'BB-STJUDE-04',
 requestingFacilityName: user?.facilityName || 'BICOL REGIONAL HOSPITAL AND MEDICAL CENTER',
 requestingFacilityType: 'blood_bank',
 targetFacilityId: 'NBC-METRO-01',
 targetFacilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 targetFacilityType: 'blood_center',
 requiredComponent: firstItem.component,
 requiredBloodType: firstItem.bloodType,
 quantityRequested: totalQty,
 allocatedUnitIds: [],
 items: requisitionItems,
 requestorName: user?.name || 'Blood Bank Staff',
 notes: `Batch stock replenishment request of ${items.length} blood product types.`
 })) onClose();
 };

 // Get cell color based on stock count
 const getCellStyle = (count: number, isSelected: boolean) => {
 let bg = 'bg-slate-800/40';
 let text = 'text-slate-600';
 let border = 'border-slate-800/40';
 let tone = 'stock-cell-empty';

 if (count > 20) {
 bg = 'bg-emerald-950/60';
 text = 'text-emerald-400';
 border = 'border-emerald-900/40';
 tone = 'stock-cell-high';
 } else if (count > 10) {
 bg = 'bg-emerald-950/30';
 text = 'text-emerald-400';
 border = 'border-emerald-900/30';
 tone = 'stock-cell-medium';
 } else if (count > 5) {
 bg = 'bg-amber-950/40';
 text = 'text-amber-400';
 border = 'border-amber-900/30';
 tone = 'stock-cell-low';
 } else if (count > 0) {
 bg = 'bg-orange-950/40';
 text = 'text-orange-400';
 border = 'border-orange-900/30';
 tone = 'stock-cell-critical';
 }

 if (isSelected) {
 bg = 'bg-primary';
 border = 'border-primary';
 text = 'text-primary-foreground';
 tone = 'stock-cell-queued';
 }

 return `stock-matrix-cell ${tone} ${bg} ${text} ${border}`;
 };

 // Compute total center stock for summary
 const totalCenterStock = BLOOD_GROUPS.reduce((sum, g) =>
 sum + COMPONENTS.reduce((s, c) => s + getCenterStock(g, c), 0), 0
 );

 return (
 <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
 <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl text-slate-100 overflow-hidden flex flex-col my-4 max-h-[92vh]">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white">
 <ShoppingCart className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-bold text-base text-white">Create Multi-Item Blood Request</h3>
 <p className="text-xs text-slate-400">Select an in-stock product, choose the quantity, then continue building your batch</p>
 </div>
 </div>
 <Button variant="ghost" size="none" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
 <X className="w-5 h-5" />
 </Button>
 </div>

 {/* Body */}
 <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">

 {/* ── Stock Availability Matrix ── */}
 <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
 <Droplet className="w-4 h-4 text-primary fill-primary" />
 <span>Blood Center Available Stock</span>
 </h4>
 <span className="text-[10px] text-slate-500 font-mono">
 Total: <span className="text-white font-bold">{totalCenterStock}</span> units
 </span>
 </div>
 <p className="text-[10px] text-slate-500">
 Select an in-stock cell to set a quantity. You will return here after adding it to the batch queue.
 </p>

 {/* Matrix Grid */}
 <div className="overflow-x-auto">
 <table className="w-full border-collapse">
 <thead>
 <tr>
 <th className="py-2 px-2 text-left text-[9px] font-mono text-slate-500 uppercase tracking-wider w-16">
 Group
 </th>
 {COMPONENTS.map(c => (
 <th key={c} className="py-2 px-1 text-center text-[9px] font-mono text-slate-500 uppercase tracking-wider">
 {COMPONENT_SHORT[c]}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {BLOOD_GROUPS.map(g => (
 <tr key={g}>
 <td className="py-1 px-2">
 <span className="px-1.5 py-0.5 bg-primary/60 text-primary border border-primary/50 font-bold rounded font-mono text-[10px]">
 {g}
 </span>
 </td>
 {COMPONENTS.map(c => {
 const count = getCenterStock(g, c);
 const isCritical = getCenterComponentStockLevel(g, c) === 'critical';
 const queuedForCell = items.find(item => item.bloodType === g && item.component === c)?.quantity || 0;
 const isQueued = queuedForCell > 0;
 const isFullyQueued = queuedForCell >= count;
 return (
 <td key={`${g}-${c}`} className="py-1 px-1">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => handleSelectProduct(g, c, count)}
 disabled={isCritical || count === 0 || isFullyQueued}
 className={`w-full py-2.5 px-1 rounded-lg border text-center font-mono font-bold text-xs transition-all ${count > 0 && !isFullyQueued && !isCritical ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98]' : 'cursor-not-allowed opacity-60'} ${isCritical ? 'stock-matrix-cell stock-cell-restricted border-primary/50 bg-primary/40 text-primary' : getCellStyle(count, isQueued)} ${isQueued ? 'ring-2 ring-primary/40' : ''}`}
 title={isCritical
 ? `${g} is at a critical level and cannot be requested.`
 : isFullyQueued
 ? `${g} ${COMPONENT_SHORT[c]}: all ${count} available units are already in the batch queue.`
 : count > 0
 ? `${g} ${COMPONENT_SHORT[c]}: ${count} units available. Select to add to the batch queue.`
 : `${g} ${COMPONENT_SHORT[c]}: out of stock`}
 >
 {count}
 </Button>
 </td>
 );
 })}
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {/* Legend */}
 <div className="flex items-center gap-4 pt-2 border-t border-slate-900">
 <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Legend:</span>
 <div className="flex items-center gap-1">
 <div className="stock-cell-high w-3 h-3 rounded bg-emerald-950/60 border border-emerald-900/40"></div>
 <span className="text-[9px] text-slate-400">&gt;10</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="stock-cell-low w-3 h-3 rounded bg-amber-950/40 border border-amber-900/30"></div>
 <span className="text-[9px] text-slate-400">6–10</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="stock-cell-critical w-3 h-3 rounded bg-orange-950/40 border border-orange-900/30"></div>
 <span className="text-[9px] text-slate-400">1–5</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="stock-cell-empty w-3 h-3 rounded bg-slate-800/40 border border-slate-800/40"></div>
 <span className="text-[9px] text-slate-400">0</span>
 </div>
 <div className="flex items-center gap-1 ml-2">
 <div className="stock-cell-queued w-3 h-3 rounded bg-primary border border-primary ring-1 ring-primary"></div>
 <span className="text-[9px] text-slate-400">In queue</span>
 </div>
 </div>
 </div>

 {/* ── Item Builder ── */}
 <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-4">
 <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
 <Plus className="w-4 h-4" />
 <span>Select an in-stock cell to choose the quantity and add it to the batch queue.</span>
 </div>

 </div>

 {/* ── Batch Queue ── */}
 <div className="space-y-2">
 <h4 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
 Batch Queue ({items.length} items · {items.reduce((s, i) => s + i.quantity, 0)} units)
 </h4>

 <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
 <table className="w-full text-left">
 <thead className="bg-slate-900 text-slate-400 font-mono text-[9px] uppercase border-b border-slate-800">
 <tr>
 <th className="py-2 px-3">Blood Group</th>
 <th className="py-2 px-3">Component</th>
 <th className="py-2 px-3 text-center">Qty</th>
 <th className="py-2 px-3 text-center">Available</th>
 <th className="py-2 px-3 text-right"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-900 font-medium">
 {items.map((item, idx) => {
 const stock = getCenterStock(item.bloodType, item.component);
 return (
 <tr key={idx} className="transition-colors hover:bg-muted">
 <td className="py-2.5 px-3">
 <span className="px-1.5 py-0.5 bg-primary text-primary-foreground border border-primary font-bold rounded font-mono text-[10px]">
 {item.bloodType}
 </span>
 </td>
 <td className="py-2.5 px-3 text-foreground">{COMPONENT_SHORT[item.component]}</td>
 <td className="py-2.5 px-3 text-center font-mono font-bold text-foreground">{item.quantity}</td>
 <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{stock}</td>
 <td className="py-2.5 px-3 text-right">
 <Button variant="ghost" size="none" type="button" onClick={() => handleRemoveItem(idx)} className="p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
 <Trash2 className="w-3.5 h-3.5" />
 </Button>
 </td>
 </tr>
 );
 })}
 {items.length === 0 && (
 <tr>
 <td colSpan={5} className="py-6 text-center text-slate-500">
 <ShoppingCart className="w-6 h-6 mx-auto mb-1.5 opacity-35" />
 <p className="font-semibold text-[11px]">No items added yet — select from the matrix above</p>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 </div>

 {selectedProduct && (
 <div
 className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
 role="dialog"
 aria-modal="true"
 aria-labelledby="request-quantity-title"
 >
 <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 ">
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
 <Plus className="size-5" />
 </div>
 <div>
 <h4 id="request-quantity-title" className="text-base font-bold text-white">
 Add {selectedProduct.bloodType} {COMPONENT_SHORT[selectedProduct.component]}
 </h4>
 <p className="mt-1 text-xs text-slate-400">
 Choose how many units to add to this batch request.
 </p>
 </div>
 </div>
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setSelectedProduct(null)}
 className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
 aria-label="Close quantity dialog"
 >
 <X className="size-5" />
 </Button>
 </div>

 <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
 <div className="flex items-center justify-between text-xs">
 <span className="text-slate-400">Available at center</span>
 <span className="font-mono font-bold text-white">{selectedStock} units</span>
 </div>
 {queuedQuantity > 0 && (
 <div className="mt-2 flex items-center justify-between text-xs">
 <span className="text-slate-400">Already in batch queue</span>
 <span className="font-mono font-bold text-primary">{queuedQuantity} units</span>
 </div>
 )}
 <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
 <span className="font-semibold text-slate-300">Available to add</span>
 <span className="font-mono font-bold text-emerald-400">{requestableCount} units</span>
 </div>
 </div>

 <div className="mt-5">
 <label htmlFor="request-quantity" className="mb-2 block text-xs font-semibold text-slate-300">
 Quantity
 </label>
 <Input
 id="request-quantity"
 type="number"
 min={1}
 max={requestableCount}
 value={quantity}
 onChange={(event) => {
 const nextQuantity = Number(event.target.value);
 setQuantity(Number.isFinite(nextQuantity)
 ? Math.min(requestableCount, Math.max(1, nextQuantity))
 : 1);
 }}
 className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm font-bold text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary"
 autoFocus
 />
 </div>

 <div className="mt-6 flex justify-end gap-2">
 <Button variant="ghost" size="none"
 type="button"
 onClick={() => setSelectedProduct(null)}
 className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
 >
 Cancel
 </Button>
 <Button variant="ghost" size="none"
 type="button"
 onClick={handleAddItem}
 disabled={requestableCount === 0 || quantity === 0}
 className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40"
 >
 <Plus className="size-4" />
 Add to batch queue
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Footer */}
 <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2 shrink-0">
 <Button variant="ghost" size="none" type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-colors">
 Cancel
 </Button>
 <Button variant="ghost" size="none"
 onClick={handleSubmit}
 disabled={items.length === 0}
 className="px-6 py-2.5 bg-primary hover:bg-primary disabled:opacity-40 disabled:hover:bg-primary text-white font-bold rounded-xl flex items-center gap-2 transition-all"
 >
 <Send className="w-4 h-4" />
 <span>Submit Request ({items.reduce((s, i) => s + i.quantity, 0)} units)</span>
 </Button>
 </div>

 </div>
 </div>
 );
};
