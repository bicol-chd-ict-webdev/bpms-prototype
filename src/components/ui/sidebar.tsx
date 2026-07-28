import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { PanelLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContext = {
 state: 'expanded' | 'collapsed';
 open: boolean;
 setOpen: (open: boolean) => void;
 openMobile: boolean;
 setOpenMobile: (open: boolean) => void;
 isMobile: boolean;
 toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
 const context = React.useContext(SidebarContext);
 if (!context) {
 throw new Error('useSidebar must be used within a SidebarProvider.');
 }
 return context;
}

const SidebarProvider = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'> & {
 defaultOpen?: boolean;
 open?: boolean;
 onOpenChange?: (open: boolean) => void;
 }
>(
 (
 {
 defaultOpen = true,
 open: openProp,
 onOpenChange: setOpenProp,
 className,
 style,
 children,
 ...props
 },
 ref
 ) => {
 const [isMobile, setIsMobile] = React.useState(false);
 const [openMobile, setOpenMobile] = React.useState(false);

 React.useEffect(() => {
 const checkMobile = () => {
 setIsMobile(window.innerWidth < 768);
 };
 checkMobile();
 window.addEventListener('resize', checkMobile);
 return () => window.removeEventListener('resize', checkMobile);
 }, []);

 // Internal open state
 const [_open, _setOpen] = React.useState(defaultOpen);
 const open = openProp ?? _open;
 const setOpen = React.useCallback(
 (value: boolean | ((value: boolean) => boolean)) => {
 const openState = typeof value === 'function' ? value(open) : value;
 if (setOpenProp) {
 setOpenProp(openState);
 } else {
 _setOpen(openState);
 }
 },
 [setOpenProp, open]
 );

 const toggleSidebar = React.useCallback(() => {
 return isMobile
 ? setOpenMobile((open) => !open)
 : setOpen((open) => !open);
 }, [isMobile, setOpen, setOpenMobile]);

 React.useEffect(() => {
 const handleKeyDown = (event: KeyboardEvent) => {
 if (
 event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
 (event.metaKey || event.ctrlKey)
 ) {
 event.preventDefault();
 toggleSidebar();
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [toggleSidebar]);

 const state = open ? 'expanded' : 'collapsed';

 const contextValue = React.useMemo<SidebarContext>(
 () => ({
 state,
 open,
 setOpen,
 isMobile,
 openMobile,
 setOpenMobile,
 toggleSidebar,
 }),
 [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
 );

 return (
 <SidebarContext.Provider value={contextValue}>
 <div
 style={
 {
 '--sidebar-width': SIDEBAR_WIDTH,
 '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
 '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
 ...style,
 } as React.CSSProperties
 }
 className={cn(
 'group/sidebar-wrapper flex min-h-svh w-full text-slate-100',
 className
 )}
 ref={ref}
 {...props}
 >
 {children}
 </div>
 </SidebarContext.Provider>
 );
 }
);
SidebarProvider.displayName = 'SidebarProvider';

const Sidebar = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'> & {
 side?: 'left' | 'right';
 variant?: 'sidebar' | 'floating' | 'inset';
 collapsible?: 'offcanvas' | 'icon' | 'none';
 }
>(
 (
 {
 side = 'left',
 variant = 'sidebar',
 collapsible = 'icon',
 className,
 children,
 ...props
 },
 ref
 ) => {
 const { state, openMobile, setOpenMobile, isMobile } = useSidebar();

 if (collapsible === 'none') {
 return (
 <div
 className={cn(
 'flex h-full w-[--sidebar-width] flex-col bg-slate-900 border-r border-slate-800 text-slate-100',
 className
 )}
 ref={ref}
 {...props}
 >
 {children}
 </div>
 );
 }

 if (isMobile) {
 return (
 <>
 {openMobile && (
 <div
 className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity md:hidden"
 onClick={() => setOpenMobile(false)}
 />
 )}
 <div
 ref={ref}
 className={cn(
 'fixed inset-y-0 left-0 z-50 flex h-full w-[--sidebar-width-mobile] flex-col border-r border-slate-800 bg-slate-900 text-slate-100 transition-transform duration-200 ease-in-out md:hidden',
 openMobile ? 'translate-x-0 ' : '-translate-x-full',
 className
 )}
 {...props}
 >
 <div className="flex h-full w-full flex-col">{children}</div>
 </div>
 </>
 );
 }

 return (
 <div
 ref={ref}
 className="group peer hidden md:block text-slate-100"
 data-state={state}
 data-collapsible={state === 'collapsed' ? collapsible : ''}
 data-variant={variant}
 data-side={side}
 >
 <div
 className={cn(
 'duration-200 sticky top-0 h-screen w-[--sidebar-width] transition-[width] ease-linear',
 'group-data-[collapsible=icon]:w-[--sidebar-width-icon]',
 'group-data-[side=left]:border-r group-data-[side=right]:border-l border-slate-800 bg-slate-900/95 backdrop-blur-md',
 className
 )}
 {...props}
 >
 <div className="flex h-full w-full flex-col">{children}</div>
 </div>
 </div>
 );
 }
);
Sidebar.displayName = 'Sidebar';

const SidebarTrigger = React.forwardRef<
 React.ElementRef<typeof Button>,
 React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
 const { toggleSidebar } = useSidebar();
 return (
 <Button
 ref={ref}
 data-sidebar="trigger"
 variant="ghost"
 size="icon"
 className={cn('h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800', className)}
 onClick={(event) => {
 onClick?.(event);
 toggleSidebar();
 }}
 {...props}
 >
 <PanelLeft className="h-4 w-4" />
 <span className="sr-only">Toggle Sidebar</span>
 </Button>
 );
});
SidebarTrigger.displayName = 'SidebarTrigger';

const SidebarRail = React.forwardRef<
 HTMLButtonElement,
 React.ComponentProps<'button'>
>(({ className, ...props }, ref) => {
 const { toggleSidebar } = useSidebar();

 return (
 <button
 ref={ref}
 data-sidebar="rail"
 aria-label="Toggle Sidebar"
 tabIndex={-1}
 onClick={toggleSidebar}
 title="Toggle Sidebar"
 className={cn(
 'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-primary group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
 'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
 '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
 className
 )}
 {...props}
 />
 );
});
SidebarRail.displayName = 'SidebarRail';

const SidebarHeader = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'>
>(({ className, ...props }, ref) => {
 return (
 <div
 ref={ref}
 data-sidebar="header"
 className={cn('flex flex-col gap-2 p-3 border-b border-slate-800/80', className)}
 {...props}
 />
 );
});
SidebarHeader.displayName = 'SidebarHeader';

const SidebarFooter = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'>
>(({ className, ...props }, ref) => {
 return (
 <div
 ref={ref}
 data-sidebar="footer"
 className={cn('flex flex-col gap-2 p-3 border-t border-slate-800/80 mt-auto', className)}
 {...props}
 />
 );
});
SidebarFooter.displayName = 'SidebarFooter';

const SidebarContent = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'>
>(({ className, ...props }, ref) => {
 return (
 <div
 ref={ref}
 data-sidebar="content"
 className={cn(
 'flex min-h-0 flex-1 flex-col gap-2 overflow-auto py-2 group-data-[collapsible=icon]:overflow-hidden',
 className
 )}
 {...props}
 />
 );
});
SidebarContent.displayName = 'SidebarContent';

const SidebarGroup = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'>
>(({ className, ...props }, ref) => {
 return (
 <div
 ref={ref}
 data-sidebar="group"
 className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
 {...props}
 />
 );
});
SidebarGroup.displayName = 'SidebarGroup';

const SidebarGroupLabel = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
 const Comp = asChild ? Slot : 'div';

 return (
 <Comp
 ref={ref}
 data-sidebar="group-label"
 className={cn(
 'duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider outline-none transition-[margin,opaicty] ease-linear focus-visible:ring-2 focus-visible:ring-primary [&>svg]:size-4 [&>svg]:shrink-0',
 'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
 className
 )}
 {...props}
 />
 );
});
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

const SidebarGroupContent = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 data-sidebar="group-content"
 className={cn('w-full text-xs', className)}
 {...props}
 />
));
SidebarGroupContent.displayName = 'SidebarGroupContent';

const SidebarMenu = React.forwardRef<
 HTMLUListElement,
 React.ComponentProps<'ul'>
>(({ className, ...props }, ref) => (
 <ul
 ref={ref}
 data-sidebar="menu"
 className={cn('flex w-full min-w-0 flex-col gap-1', className)}
 {...props}
 />
));
SidebarMenu.displayName = 'SidebarMenu';

const SidebarMenuItem = React.forwardRef<
 HTMLLIElement,
 React.ComponentProps<'li'>
>(({ className, ...props }, ref) => (
 <li
 ref={ref}
 data-sidebar="menu-item"
 className={cn('group/menu-item relative list-none', className)}
 {...props}
 />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

const SidebarMenuButton = React.forwardRef<
 HTMLButtonElement,
 React.ComponentProps<'button'> & {
 asChild?: boolean;
 isActive?: boolean;
 tooltip?: string;
 variant?: 'default' | 'outline';
 size?: 'default' | 'sm' | 'lg';
 }
>(
 (
 {
 asChild = false,
 isActive = false,
 variant = 'default',
 size = 'default',
 tooltip,
 className,
 ...props
 },
 ref
 ) => {
 const Comp = asChild ? Slot : 'button';

 return (
 <Comp
 ref={ref}
 data-sidebar="menu-button"
 data-size={size}
 data-active={isActive}
 className={cn(
 'peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-xl p-2.5 text-left text-xs font-semibold outline-none transition-all hover:bg-slate-800/80 hover:text-white focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
 isActive &&
 'bg-primary text-white font-bold hover:bg-primary',
 className
 )}
 {...props}
 />
 );
 }
);
SidebarMenuButton.displayName = 'SidebarMenuButton';

const SidebarMenuBadge = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'div'>
>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 data-sidebar="menu-badge"
 className={cn(
 'pointer-events-none ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden',
 className
 )}
 {...props}
 />
));
SidebarMenuBadge.displayName = 'SidebarMenuBadge';

const SidebarInset = React.forwardRef<
 HTMLDivElement,
 React.ComponentProps<'main'>
>(({ className, ...props }, ref) => {
 return (
 <main
 ref={ref}
 className={cn(
 'relative flex min-h-svh flex-1 flex-col bg-slate-950 text-slate-100 min-w-0',
 className
 )}
 {...props}
 />
 );
});
SidebarInset.displayName = 'SidebarInset';

export {
 Sidebar,
 SidebarContent,
 SidebarFooter,
 SidebarGroup,
 SidebarGroupContent,
 SidebarGroupLabel,
 SidebarHeader,
 SidebarInset,
 SidebarMenu,
 SidebarMenuBadge,
 SidebarMenuButton,
 SidebarMenuItem,
 SidebarProvider,
 SidebarRail,
 SidebarTrigger,
 useSidebar,
};
