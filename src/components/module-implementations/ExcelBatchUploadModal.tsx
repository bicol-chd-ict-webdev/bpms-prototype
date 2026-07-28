import { Button } from '../ui/button';
import React, { useState, useRef } from 'react';
import { Input } from '../ui/input';
import { 
 FileSpreadsheet, 
 Upload, 
 Download, 
 X, 
 CheckCircle2, 
 AlertTriangle, 
 FileText, 
 RefreshCw,
 Sparkles,
 Droplet,
 LoaderCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useBloodData } from '../../context/BloodDataContext';
import {
 BLOOD_COLLECTION_TEMPLATE_FILE_NAME,
 BLOOD_COLLECTION_TEMPLATE_SHEET_NAME,
 getBloodCollectionTemplateRows,
} from '../../lib/bloodCollectionTemplate';
import { BloodUnit, FullBloodType, BloodComponentType } from '../../types/blood';
import { BLOOD_COMPONENTS, BLOOD_GROUPS } from '../../lib/bloodCatalog';
import { Progress } from '../ui/progress';

interface ExcelBatchUploadModalProps {
 isOpen: boolean;
 onClose: () => void;
}

interface ParsedCollectionRow {
 serialNumber: string;
 donorId: string;
 bloodType: FullBloodType;
 component: BloodComponentType;
 volumeMl: number;
 donationDate: string;
 expiryDate: string;
 notes?: string;
 isValid: boolean;
 errorReason?: string;
}

type SpreadsheetRow = Record<string, unknown>;

const VALID_BLOOD_TYPES = BLOOD_GROUPS;
const VALID_COMPONENTS = BLOOD_COMPONENTS;

const formatCollectionDate = (value: unknown) => {
 const fallback = new Date();

 if (typeof value === 'number') {
 const parsedExcelDate = XLSX.SSF.parse_date_code(value);
 if (parsedExcelDate) {
 return new Date(Date.UTC(parsedExcelDate.y, parsedExcelDate.m - 1, parsedExcelDate.d)).toISOString().split('T')[0];
 }
 }

 const parsedDate = new Date(String(value || fallback));
 return Number.isNaN(parsedDate.getTime()) ? fallback.toISOString().split('T')[0] : parsedDate.toISOString().split('T')[0];
};

export const ExcelBatchUploadModal: React.FC<ExcelBatchUploadModalProps> = ({ isOpen, onClose }) => {
 const { addBatchBloodUnits, bloodUnits } = useBloodData();
 const fileInputRef = useRef<HTMLInputElement>(null);

 const [fileName, setFileName] = useState<string | null>(null);
 const [parsedRows, setParsedRows] = useState<ParsedCollectionRow[]>([]);
 const [isDragOver, setIsDragOver] = useState(false);
 const [isProcessing, setIsProcessing] = useState(false);
 const [isImporting, setIsImporting] = useState(false);
 const [importProgress, setImportProgress] = useState(0);
 const [isSuccess, setIsSuccess] = useState(false);
 const [importedCount, setImportedCount] = useState(0);

 if (!isOpen) return null;

 // Generate and download sample Excel Template
 const handleDownloadTemplate = () => {
 const worksheet = XLSX.utils.json_to_sheet(getBloodCollectionTemplateRows());
 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, BLOOD_COLLECTION_TEMPLATE_SHEET_NAME);
 XLSX.writeFile(workbook, BLOOD_COLLECTION_TEMPLATE_FILE_NAME);
 };

 // Helper to normalize object keys from Excel
 const getFieldValue = (row: SpreadsheetRow, possibleKeys: string[]): unknown => {
 for (const key of Object.keys(row)) {
 const cleanKey = key.trim().toLowerCase();
 for (const possible of possibleKeys) {
 if (cleanKey.includes(possible.toLowerCase())) {
 return row[key];
 }
 }
 }
 return undefined;
 };

 // Process selected file
 const processFile = (file: File) => {
 setFileName(file.name);
 setIsProcessing(true);
 setIsSuccess(false);

 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const data = new Uint8Array(e.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const firstSheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[firstSheetName];
 const jsonRows = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet);

 const existingSerialNumbers = new Set(bloodUnits.map(u => u.id.trim().toUpperCase()));

 const processed: ParsedCollectionRow[] = jsonRows.map((row, idx) => {
 const serialNumberRaw = getFieldValue(row, ['serial number', 'din', 'serial', 'unit id', 'barcode']);
 let serialNumber: string;
 if (!serialNumberRaw || String(serialNumberRaw).trim() === '') {
 serialNumber = `DIN-2026-${Math.floor(8800 + idx + Math.random() * 100)}`;
 } else {
 serialNumber = String(serialNumberRaw).trim().toUpperCase();
 }

 const donorIdRaw = getFieldValue(row, ['donor id', 'donor no', 'donor', 'id']);
 let donorId: string;
 if (!donorIdRaw || String(donorIdRaw).trim() === '') {
 donorId = `DNR-${Math.floor(10000 + Math.random() * 90000)}`;
 } else {
 donorId = String(donorIdRaw).trim();
 }

 let bloodTypeRaw = getFieldValue(row, ['blood type', 'blood group', 'group', 'type']);
 let bloodType: FullBloodType = 'O-';
 if (bloodTypeRaw && VALID_BLOOD_TYPES.includes(String(bloodTypeRaw).trim().toUpperCase() as FullBloodType)) {
 bloodType = String(bloodTypeRaw).trim().toUpperCase() as FullBloodType;
 }

 let componentRaw = getFieldValue(row, ['component', 'blood component']);
 let component: BloodComponentType = 'Whole Blood'; // Default raw collection is Whole Blood
 if (componentRaw) {
 const compStr = String(componentRaw).toLowerCase();
 if (compStr.includes('prbc') || compStr.includes('red blood')) {
 component = 'Packed Red Blood Cells (PRBC)';
 } else if (compStr.includes('ffp') || compStr.includes('plasma')) {
 component = 'Fresh Frozen Plasma (FFP)';
 } else if (compStr.includes('platelet')) {
 component = 'Platelet Concentrate';
 } else if (compStr.includes('cryo')) {
 component = 'Cryoprecipitate';
 } else if (compStr.includes('whole') || compStr.includes('raw')) {
 component = 'Whole Blood';
 }
 }

 let volumeRaw = getFieldValue(row, ['volume', 'vol', 'ml']);
 let volumeMl = Number(volumeRaw) || 450;

 const donationDate = formatCollectionDate(getFieldValue(row, ['collection date', 'donation date', 'date']));

 let notes = getFieldValue(row, ['notes', 'comments', 'remarks']) || 'Bulk batch collection upload via Excel.';

 let isValid = true;
 let errorReason = '';

 if (existingSerialNumbers.has(serialNumber)) {
 isValid = false;
 errorReason = 'Serial Number already registered in database';
 }

 return {
 serialNumber,
 donorId: String(donorId),
 bloodType,
 component,
 volumeMl,
 donationDate,
 expiryDate: '',
 notes: String(notes),
 isValid,
 errorReason
 };
 });

 setParsedRows(processed);
 } catch (err) {
 console.error('Error parsing Excel file:', err);
 } finally {
 setIsProcessing(false);
 }
 };

 reader.readAsArrayBuffer(file);
 };

 const handleFileDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragOver(false);
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 processFile(e.dataTransfer.files[0]);
 }
 };

 const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 processFile(e.target.files[0]);
 }
 };

 const handleConfirmImport = async () => {
 const validRows = parsedRows.filter(r => r.isValid);
 if (validRows.length === 0 || isImporting) return;

 const newUnits: BloodUnit[] = validRows.map(row => ({
 id: row.serialNumber,
 bloodType: row.bloodType,
 component: row.component,
 volumeMl: row.volumeMl,
 status: 'Quarantine',
 donationDate: row.donationDate,
 expiryDate: row.expiryDate,
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
 facilityName: 'BICOL SOUTH LUZON SUBNATIONAL REFERENCE LABORATORY',
 role: 'blood_center',
 },
 donorId: row.donorId,
 notes: row.notes
 }));

 setIsImporting(true);
 setImportProgress(12);

 try {
 await new Promise(resolve => window.setTimeout(resolve, 550));
 setImportProgress(46);
 await new Promise(resolve => window.setTimeout(resolve, 850));
 setImportProgress(78);
 await new Promise(resolve => window.setTimeout(resolve, 1_000));

 addBatchBloodUnits(newUnits);
 setImportProgress(100);
 setImportedCount(newUnits.length);
 setIsSuccess(true);
 } finally {
 setIsImporting(false);
 }
 };

 const handleReset = () => {
 setFileName(null);
 setParsedRows([]);
 setIsSuccess(false);
 setIsImporting(false);
 setImportProgress(0);
 };

 const validCount = parsedRows.filter(r => r.isValid).length;
 const invalidCount = parsedRows.length - validCount;

 return (
 <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="p-2 rounded-xl bg-emerald-600 text-white">
 <FileSpreadsheet className="w-5 h-5" />
 </div>
 <div>
 <h3 className="font-bold text-white text-base">Batch Blood Collection Upload (Excel)</h3>
 <p className="text-xs text-slate-400">Import blood donor collection records with serial numbers (DIN) via Excel or CSV</p>
 </div>
 </div>
 <Button variant="ghost" size="none" 
 onClick={onClose} 
 className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
 >
 <X className="w-5 h-5" />
 </Button>
 </div>

 {/* Content Body */}
 <div className="p-6 space-y-5 overflow-y-auto flex-1">

 {/* Success Screen */}
 {isSuccess ? (
 <div className="p-8 text-center space-y-4 bg-emerald-950/30 border border-emerald-800/60 rounded-2xl">
 <div className="w-16 h-16 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto">
 <CheckCircle2 className="w-10 h-10" />
 </div>
 <div className="space-y-1">
 <h4 className="text-xl font-bold text-white">Batch Upload Successful!</h4>
 <p className="text-sm text-slate-300">
 Successfully imported <span className="font-bold text-emerald-400">{importedCount} blood collection records</span> into the National Blood Processing Hub database.
 </p>
 </div>

 <div className="pt-4 flex justify-center gap-3">
 <Button variant="ghost" size="none"
 onClick={handleReset}
 className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-2"
 >
 <RefreshCw className="w-4 h-4" />
 <span>Upload Another Excel File</span>
 </Button>
 <Button variant="ghost" size="none"
 onClick={onClose}
 className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
 >
 Done
 </Button>
 </div>
 </div>
 ) : parsedRows.length === 0 ? (
 /* File Upload Zone */
 <div className="space-y-4">
 
 {/* Template Download Bar */}
 <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
 <div className="flex items-center gap-3">
 <Sparkles className="w-5 h-5 text-amber-400" />
 <div>
 <h4 className="font-bold text-xs text-white">Need a sample Excel template with serial numbers?</h4>
 <p className="text-[11px] text-slate-400">Download our formatted .xlsx template with DIN serials, blood types, and donor fields.</p>
 </div>
 </div>
 <Button variant="ghost" size="none"
 type="button"
 onClick={handleDownloadTemplate}
 className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
 >
 <Download className="w-4 h-4 text-emerald-400" />
 <span>Download Template</span>
 </Button>
 </div>

 {/* Drag and Drop Zone */}
 <div
 onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
 onDragLeave={() => setIsDragOver(false)}
 onDrop={handleFileDrop}
 onClick={() => fileInputRef.current?.click()}
 className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
 isDragOver 
 ? 'border-emerald-500 bg-emerald-950/20' 
 : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
 }`}
 >
 <Input 
 type="file" 
 ref={fileInputRef} 
 onChange={handleFileSelect} 
 accept=".xlsx, .xls, .csv" 
 className="hidden" 
 />

 <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-slate-700">
 <Upload className="w-6 h-6" />
 </div>

 <p className="text-sm font-bold text-white">
 Click to browse or drag and drop your Excel collection file
 </p>
 <p className="text-xs text-slate-400 mt-1">
 Supports .xlsx, .xls, and .csv files containing unit serial numbers (DIN)
 </p>
 </div>
 </div>
 ) : (
 /* Parsed Excel Preview Grid */
 <div className="space-y-4">

 {isImporting && (
 <div role="status" aria-live="polite" className="rounded-xl border border-primary/30 bg-primary/10 p-4">
 <div className="flex items-start gap-3">
 <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
 <div className="min-w-0 flex-1">
 <div className="flex items-center justify-between gap-3">
 <p className="text-sm font-semibold text-white">Registering collection units</p>
 <span className="font-mono text-xs text-primary">{importProgress}%</span>
 </div>
 <p className="mt-1 text-xs text-slate-400">Validating DINs, creating quarantine records, and updating inventory traceability.</p>
 <Progress value={importProgress} className="mt-3" />
 </div>
 </div>
 </div>
 )}
 
 {/* File Info Header */}
 <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
 <div className="flex items-center gap-3">
 <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
 <div>
 <h4 className="font-bold text-xs text-white">{fileName}</h4>
 <span className="text-[11px] text-slate-400">
 Parsed {parsedRows.length} collection rows
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono font-bold text-xs">
 {validCount} Valid
 </span>
 {invalidCount > 0 && (
 <span className="px-2.5 py-1 rounded-lg bg-primary/80 border border-primary/80 text-primary font-mono font-bold text-xs">
 {invalidCount} Duplicate / Invalid
 </span>
 )}
 <Button variant="ghost" size="none"
 onClick={handleReset}
 className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
 title="Change file"
 >
 <RefreshCw className="w-4 h-4" />
 </Button>
 </div>
 </div>

 {/* Data Table */}
 <div className="border border-slate-800 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0">
 <tr>
 <th className="p-3">Status</th>
 <th className="p-3">Unit Serial (DIN)</th>
 <th className="p-3">Donor ID</th>
 <th className="p-3">Blood Group</th>
 <th className="p-3">Component</th>
 <th className="p-3">Vol (mL)</th>
 <th className="p-3">Date</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-800/60 font-mono">
 {parsedRows.map((row, idx) => (
 <tr key={idx} className={row.isValid ? 'bg-slate-900/50 hover:bg-slate-800/50' : 'bg-primary/20 hover:bg-primary/30'}>
 <td className="p-3">
 {row.isValid ? (
 <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
 <CheckCircle2 className="w-3.5 h-3.5" /> Ready
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-primary font-bold text-[10px]" title={row.errorReason}>
 <AlertTriangle className="w-3.5 h-3.5" /> {row.errorReason || 'Invalid'}
 </span>
 )}
 </td>
 <td className="p-3 font-bold text-white">{row.serialNumber}</td>
 <td className="p-3 text-slate-300">{row.donorId}</td>
 <td className="p-3">
 <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold border border-primary/50">
 {row.bloodType}
 </span>
 </td>
 <td className="p-3 text-slate-300 font-sans">{row.component}</td>
 <td className="p-3 text-slate-300">{row.volumeMl} mL</td>
 <td className="p-3 text-slate-400">{row.donationDate}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 </div>
 )}

 </div>

 {/* Modal Footer */}
 {!isSuccess && (
 <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
 <span className="text-xs text-slate-400">
 {isImporting
 ? `Registering ${validCount} collection units in the processing quarantine`
 : parsedRows.length > 0 ? `${validCount} units ready to import into processing quarantine` : 'Upload an Excel or CSV file to parse records'}
 </span>
 <div className="flex items-center gap-3">
 <Button variant="ghost" size="none"
 type="button"
 onClick={onClose}
 disabled={isImporting}
 className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
 >
 Cancel
 </Button>
 {parsedRows.length > 0 && (
 <Button variant="ghost" size="none"
 type="button"
 disabled={validCount === 0 || isProcessing || isImporting}
 onClick={handleConfirmImport}
 className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
 >
 {isImporting ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
 <span>{isImporting ? 'Importing collection units…' : `Import ${validCount} Collection Units`}</span>
 </Button>
 )}
 </div>
 </div>
 )}

 </div>
 </div>
 );
};
