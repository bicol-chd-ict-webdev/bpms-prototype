import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { RequisitionOrder } from '../../types/blood';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from '../ui/alert-dialog';

interface ConfirmBloodReceiptAlertDialogProps {
 requisition: RequisitionOrder | null;
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onConfirm: (requisitionId: string) => void;
}

export const ConfirmBloodReceiptAlertDialog: React.FC<ConfirmBloodReceiptAlertDialogProps> = ({
 requisition,
 open,
 onOpenChange,
 onConfirm,
}) => {
 const providedUnits = requisition?.items.reduce(
  (total, item) => total + (item.quantityProvided ?? item.quantityRequested),
  0,
 ) ?? 0;

 const confirmReceipt = () => {
  if (!requisition) return;
  onConfirm(requisition.id);
 };

 return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
   <AlertDialogContent>
    <AlertDialogHeader>
     <AlertDialogTitle>Confirm receipt of blood units?</AlertDialogTitle>
     <AlertDialogDescription>
      This will add {providedUnits} allocated unit{providedUnits === 1 ? '' : 's'} from requisition {requisition?.id ?? ''} to your facility inventory. Confirm only after the delivery has been checked and accepted.
     </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
     <AlertDialogCancel>Cancel</AlertDialogCancel>
     <AlertDialogAction onClick={confirmReceipt}>
      <CheckCircle2 data-icon="inline-start" />
      Confirm receipt
     </AlertDialogAction>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>
 );
};
