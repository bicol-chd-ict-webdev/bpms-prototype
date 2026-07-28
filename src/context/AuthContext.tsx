import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile } from '../types/blood';
import { DEMO_USERS } from '../data/mockData';
import { toast } from 'sonner';

interface AuthContextType {
 user: UserProfile | null;
 currentRole: UserRole;
 isAuthenticated: boolean;
 login: (role: UserRole, email?: string, password?: string) => void;
 switchRole: (role: UserRole) => void;
 logout: () => void;
 demoUsers: UserProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 // Default to logged-in as Blood Center for immediate access to Blood Center Dashboard & Collections
 const [user, setUser] = useState<UserProfile | null>(DEMO_USERS[0]); // Bicol South Luzon Subnational Reference Laboratory default
 const [currentRole, setCurrentRole] = useState<UserRole>('blood_center');

 useEffect(() => {
 // Keep user profile in sync when switching role
 const matchedUser = DEMO_USERS.find(u => u.role === currentRole);
 if (matchedUser) {
 setUser(matchedUser);
 }
 }, [currentRole]);

 const login = (role: UserRole, email?: string) => {
 const matched = DEMO_USERS.find(u => u.role === role) || {
 id: `user-${Date.now()}`,
 name: email ? email.split('@')[0] : 'Authorized Staff',
 email: email || `staff@${role}.gov`,
 role: role,
 facilityName: role === 'blood_center' 
 ? 'Regional Blood Center Hub' 
 : role === 'blood_bank' 
 ? 'Regional Blood Bank Facility' 
 : 'Emergency Blood Station Unit',
 facilityCode: `FAC-${role.toUpperCase()}-01`,
 location: 'Medical District',
 contactNumber: '+1 (555) 000-1122',
 licenseNumber: `LIC-${Math.floor(Math.random() * 900000 + 100000)}`
 };
 
 setCurrentRole(role);
 setUser(matched);
 toast.success('Signed in successfully', {
 description: `Welcome to ${matched.facilityName}.`,
 });
 };

 const switchRole = (role: UserRole) => {
 setCurrentRole(role);
 const matched = DEMO_USERS.find(u => u.role === role);
 if (matched) {
 setUser(matched);
 toast.success('Role switched', {
 description: `You are now viewing the ${matched.facilityName} workspace.`,
 });
 }
 };

 const logout = () => {
 setUser(null);
 toast.success('Signed out successfully');
 };

 return (
 <AuthContext.Provider value={{
 user,
 currentRole,
 isAuthenticated: !!user,
 login,
 switchRole,
 logout,
 demoUsers: DEMO_USERS
 }}>
 {children}
 </AuthContext.Provider>
 );
};

export const useAuth = () => {
 const context = useContext(AuthContext);
 if (!context) {
 throw new Error('useAuth must be used within an AuthProvider');
 }
 return context;
};
