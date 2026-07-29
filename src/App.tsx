import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BloodDataProvider, useBloodData } from './context/BloodDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginForm } from './components/auth/LoginForm';
import { Sidebar } from './components/common/Sidebar';
import { BloodCenterDashboard } from './components/dashboards/BloodCenterDashboard';
import { BloodBankDashboard } from './components/dashboards/BloodBankDashboard';
import { BloodServiceFacilityDashboard } from './components/dashboards/BloodServiceFacilityDashboard';
import { FacilityPricingSettings } from './components/modules/FacilityPricingSettings';
import { UnitDetailModal } from './components/common/UnitDetailModal';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';
import { Toaster } from './components/ui/sonner';

function MainApp() {
 const { isAuthenticated, currentRole } = useAuth();
 const { bloodUnits } = useBloodData();

 const [activeTab, setActiveTab] = useState('dashboard');
 const [inspectedUnitId, setInspectedUnitId] = useState<string | null>(null);

 if (!isAuthenticated) {
 return <LoginForm />;
 }

 const inspectedUnit = bloodUnits.find(u => u.id === inspectedUnitId) || null;

 return (
 <SidebarProvider defaultOpen={true}>
 <div className="min-h-screen bg-background text-foreground flex w-full font-sans selection:bg-primary selection:text-primary-foreground">
 
 {/* Role-Specific Sidebar */}
 <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

 {/* Main Dashboard Canvas Area wrapped in SidebarInset */}
 <SidebarInset>
 <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
 {activeTab === 'pricing' ? (
 <FacilityPricingSettings />
 ) : <>
 {currentRole === 'blood_center' && (
 <BloodCenterDashboard activeTab={activeTab} />
 )}

 {currentRole === 'blood_bank' && (
 <BloodBankDashboard activeTab={activeTab} />
 )}

 {currentRole === 'blood_service_facility' && (
 <BloodServiceFacilityDashboard activeTab={activeTab} />
 )}
 </>}
 </div>
 </SidebarInset>

 {/* Global Unit Inspection Modal */}
 <UnitDetailModal
 unit={inspectedUnit}
 onClose={() => setInspectedUnitId(null)}
 />

 </div>
 </SidebarProvider>
 );
}

export default function App() {
 return (
 <ThemeProvider>
 <AuthProvider>
 <BloodDataProvider>
 <MainApp />
 <Toaster position="bottom-center" closeButton richColors />
 </BloodDataProvider>
 </AuthProvider>
 </ThemeProvider>
 );
}
