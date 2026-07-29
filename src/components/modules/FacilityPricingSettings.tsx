import React, { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Save, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBloodData } from '../../context/BloodDataContext';
import { BloodComponentType, FacilityComponentPrices } from '../../types/blood';
import { BLOOD_COMPONENTS, getComponentLabel } from '../../lib/bloodCatalog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group';

type PriceDraft = Record<BloodComponentType, string>;

const createDraft = (prices?: FacilityComponentPrices): PriceDraft => Object.fromEntries(
 BLOOD_COMPONENTS.map(component => [component, prices?.[component] === null || prices?.[component] === undefined ? '' : String(prices[component])]),
) as PriceDraft;

const formatUpdatedAt = (value?: string) => value ? new Intl.DateTimeFormat('en-PH', {
 dateStyle: 'medium',
 timeStyle: 'short',
}).format(new Date(value)) : 'Not yet saved';

export const FacilityPricingSettings: React.FC = () => {
 const { user } = useAuth();
 const { facilityPricingConfigurations, saveFacilityComponentPrices } = useBloodData();
 const savedConfiguration = user ? facilityPricingConfigurations[user.facilityCode] : undefined;
 const [draft, setDraft] = useState<PriceDraft>(() => createDraft(savedConfiguration?.prices));

 useEffect(() => {
  setDraft(createDraft(savedConfiguration?.prices));
 }, [savedConfiguration?.updatedAt, user?.facilityCode]);

 const configuredCount = useMemo(() => BLOOD_COMPONENTS.filter(component => draft[component].trim() !== '').length, [draft]);

 if (!user) return null;

 const updatePrice = (component: BloodComponentType, value: string) => {
  if (value === '' || /^\d*(\.\d{0,2})?$/.test(value)) {
   setDraft(previous => ({ ...previous, [component]: value }));
  }
 };

 const savePrices = () => {
  const prices = Object.fromEntries(BLOOD_COMPONENTS.map(component => {
   const value = draft[component].trim();
   return [component, value === '' ? null : Number(value)];
  })) as FacilityComponentPrices;

  saveFacilityComponentPrices(user.facilityCode, user.facilityName, prices);
 };

 return (
  <div className="flex w-full flex-col gap-6">
   <Card>
    <CardHeader className="gap-4 px-6 py-6 lg:px-8">
     <div className="flex min-w-0 items-start gap-3">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CircleDollarSign className="size-5" /></div>
      <div className="min-w-0">
       <CardTitle className="text-xl">Component pricing</CardTitle>
       <CardDescription className="mt-1 max-w-4xl">Set the amount charged per blood unit for each component at {user.facilityName}. Pricing applies to every blood group within the selected component.</CardDescription>
      </div>
     </div>
     <CardAction className="self-start sm:self-auto">
      <Badge variant="secondary" className="gap-1.5 px-3 py-2 text-xs"><span>Configured rates</span><strong className="font-mono">{configuredCount} / {BLOOD_COMPONENTS.length}</strong></Badge>
     </CardAction>
    </CardHeader>
    <CardContent className="border-t px-6 py-4 text-sm text-muted-foreground lg:px-8">Currency: Philippine peso (PHP). Leave a field blank when no rate has been set.</CardContent>
   </Card>

   <Card className="w-full">
    <CardHeader className="px-6 pt-6 lg:px-8 lg:pt-7">
     <CardTitle>Prices per component</CardTitle>
     <CardDescription>Rates are saved only for this facility and can be revised whenever needed.</CardDescription>
    </CardHeader>
    <CardContent className="px-6 pb-6 lg:px-8 lg:pb-8">
     <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {BLOOD_COMPONENTS.map(component => (
       <Field key={component} className="rounded-xl border p-4">
        <div className="flex items-start gap-3">
         <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Tag className="size-4" /></div>
         <div className="min-w-0">
          <FieldLabel htmlFor={`component-price-${component}`} className="text-sm font-semibold">{getComponentLabel(component)}</FieldLabel>
          <FieldDescription className="mt-1 text-xs">Per unit for all blood groups</FieldDescription>
         </div>
        </div>
        <InputGroup>
         <InputGroupAddon>PHP</InputGroupAddon>
         <InputGroupInput id={`component-price-${component}`} aria-label={`${getComponentLabel(component)} price in Philippine peso`} inputMode="decimal" placeholder="Not set" value={draft[component]} onChange={event => updatePrice(component, event.target.value)} className="text-right font-mono" />
        </InputGroup>
       </Field>
      ))}
     </FieldGroup>
    </CardContent>
    <CardFooter className="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
     <p className="text-xs text-muted-foreground">Last saved: {formatUpdatedAt(savedConfiguration?.updatedAt)}</p>
     <Button type="button" onClick={savePrices}><Save data-icon="inline-start" /> Save component prices</Button>
    </CardFooter>
   </Card>
  </div>
 );
};
