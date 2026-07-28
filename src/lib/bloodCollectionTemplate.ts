export const BLOOD_COLLECTION_TEMPLATE_FILE_NAME = 'Blood_Collection_Serial_Template.xlsx';
export const BLOOD_COLLECTION_TEMPLATE_SHEET_NAME = 'Blood Collections';
const TEMPLATE_ROW_COUNT = 500;
const TEMPLATE_BLOOD_TYPES = ['O+', 'A+', 'B-', 'AB+', 'O-', 'A-', 'B+', 'AB-'] as const;

/** Upload-ready raw collection rows for blood-center intake. */
export const getBloodCollectionTemplateRows = () => {
  const collectionDate = new Date();
  const serialSeed = Date.now().toString().slice(-8);
  const formattedCollectionDate = collectionDate.toISOString().slice(0, 10);

  return Array.from({ length: TEMPLATE_ROW_COUNT }, (_, index) => {
    const rowNumber = String(index + 1).padStart(3, '0');

    return {
      'Serial Number (DIN)': `DIN-TPL-${serialSeed}-${rowNumber}`,
      'Blood Type': TEMPLATE_BLOOD_TYPES[index % TEMPLATE_BLOOD_TYPES.length],
      Component: 'Whole Blood',
      'Volume (mL)': 450,
      'Collection Date': formattedCollectionDate,
      Notes: 'Sample raw collection — ready to upload.',
    };
  });
};
