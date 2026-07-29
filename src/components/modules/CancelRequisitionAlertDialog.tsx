import React from 'react';
import { Ban } from 'lucide-react';
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

interface CancelRequisitionAlertDialogProps {
 requisition: RequisitionOrder | null;
 open: boolean;
 onOpenChange: (open: boolean) => void;
 onConfirm: (requisitionId: string) => void;
}

export const CancelRequisitionAlertDialog: React.FC<CancelRequisitionAlertDialogProps> = ({
 requisition,
 open,
 onOpenChange,
 onConfirm,
}) => {
 const confirmCancellation = () => {
  if (requisition) onConfirm(requisition.id);
 };

 return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
   <AlertDialogContent>
    <AlertDialogHeader>
     <AlertDialogTitle>Cancel this blood request?</AlertDialogTitle>
     <AlertDialogDescription>
      Requisition {requisition?.id ?? ''} will be cancelled and any reserved blood units will be released back to the provider&apos;s available inventory. This cannot be undone.
     </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
     <AlertDialogCancel>Keep request</AlertDialogCancel>
     <AlertDialogAction onClick={confirmCancellation} className="bg-rose-600 text-white hover:bg-rose-700">
      <Ban data-icon="inline-start" />
      Cancel request
     </AlertDialogAction>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>
 );
};
