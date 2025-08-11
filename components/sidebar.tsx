"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { MdDashboard, MdSettings } from "react-icons/md";
import { IoIosGitCompare } from "react-icons/io";
import { CiFileOn, CiSearch } from "react-icons/ci";
import { CiSaveUp2 } from "react-icons/ci";
import { HiOutlineDocumentDuplicate } from "react-icons/hi2";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoHelpCircleOutline } from "react-icons/io5";
import { TbPlugConnected } from "react-icons/tb";
import { HiOutlineUsers } from "react-icons/hi2";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function Sidebar({ className, expanded = true, onExpandedChange }: SidebarProps) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{uuid: string; vin: string}>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toast } = useToast();

  // Get user's initials
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Fetch user avatar when session is available
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch('/api/user/settings');
          if (response.ok) {
            const settings = await response.json();
            setUserAvatar(settings.avatar);
          }
        } catch (error) {
          console.error('Error fetching user settings:', error);
        }
      }
    };

    fetchUserSettings();
  }, [session]);

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch('/api/user/subscription/cancel', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      toast({
        title: 'Success',
        description: 'Your subscription has been cancelled',
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      key={expanded ? "expanded" : "collapsed"} // Force reflow with key
      className={cn(
        "relative h-full transition-all duration-300 ease-in-out",
        expanded ? "min-w-[12rem]" : "min-w-[2rem]", 
        className
      )}
    >
      <div className="gap-4 py-4 h-full bg-gray-100 relative flex flex-col">
        <div className="px-3 py-2 flex items-center justify-center">
          <Link href="/dashboard">
            {expanded ? (
              <Image src="/logo.svg" width={150} height={75} alt="Logo" />
            ) : (
              <Image src="/logo-short.svg" width={30} height={30} alt="Logo" className="transition-all duration-300 ease-in-out" />
            )}
          </Link>
        </div>

        {/* Search Input */}
        <div className="px-3 py-2 mt-3 mb-1">
          <div className={cn(
            "relative flex items-center",
            !expanded && "justify-center"
          )}>
            {expanded ? (
              <div className="relative w-full">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 shadow-inner" />
                <input
                  type="text"
                  placeholder="Search VIN..."
                  value={search}
                  onChange={async (e) => {
                    const value = e.target.value.toUpperCase();
                    setSearch(value);
                    setIsSearching(true);
                    
                    if (value.length >= 3) {
                      try {
                        const response = await fetch(`/api/vehicles?search=${value}`);
                        if (response.ok) {
                          const data = await response.json();
                          const filteredResults = data
                            .filter((vehicle: any) => {
                              const vin = vehicle.vin.toUpperCase();
                              return vin.includes(value);
                            })
                            .map((vehicle: any) => ({
                              uuid: vehicle.uuid,
                              vin: vehicle.vin
                            }));
                          setSearchResults(filteredResults);
                        }
                      } catch (error) {
                        console.error('Error searching vehicles:', error);
                        setSearchResults([]);
                      }
                    } else {
                      setSearchResults([]);
                    }
                    setIsSearching(false);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-10 rounded-lg border-[1px] border-gray-300 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 shadow-inner shadow-gray-400/20"
                />
                {search.length >= 3 && (
                  <div className="absolute w-full mt-1 bg-white rounded-lg border border-gray-300 shadow-lg z-50 max-h-48 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((result) => (
                        <Link
                          key={result.uuid}
                          href={`/dashboard/vehicle/${result.uuid}`}
                          className="block px-3 py-2 hover:bg-gray-100 text-sm text-gray-700"
                          onClick={() => {
                            setSearch('');
                            setSearchResults([]);
                          }}
                        >
                          {result.vin}
                        </Link>
                      ))
                    ) : (
                      <div className="px-5 py-3 text-sm text-gray-500">No results found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 p-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 px-3 py-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-1.5">
              <Link 
                href="/dashboard"
                className={cn(
                  "flex items-center w-full p-2 rounded-xl text-gray-800 border-gray-100 hover:bg-white border-[1px] hover:border-gray-300 hover:text-black hover:font-medium hover:shadow-sm",
                  !expanded && "justify-center p-2",
                  pathname === "/dashboard" && "bg-white border-gray-300 text-black font-medium shadow-sm"
                )}
              >
                <MdDashboard className="h-5 w-5 stroke-gray-800 hover:stroke-black" />
                {expanded && <span className="ml-3 text-sm">Dashboard</span>}
              </Link>
              <Link 
                href="/dashboard/vin-lookup"
                className={cn(
                  "flex items-center w-full p-2 rounded-xl text-gray-800 border-gray-100 hover:bg-white border-[1px] hover:border-gray-300 hover:text-black hover:font-medium hover:shadow-sm",
                  !expanded && "justify-center p-2",
                  pathname === "/dashboard/vin-lookup" && "bg-white border-gray-300 text-black font-medium shadow-sm"
                )}
              >
                <CiSearch className="h-5 w-5 stroke-gray-800 hover:stroke-black" />
                {expanded && <span className="ml-3 text-sm">VIN Lookup</span>}
              </Link>
              <Link 
                href="/dashboard/inventory"
                className={cn(
                  "flex items-center w-full p-2 rounded-xl text-gray-800 border-gray-100 hover:bg-white border-[1px] hover:border-gray-300 hover:text-black hover:font-medium hover:shadow-sm",
                  !expanded && "justify-center p-2",
                  pathname === "/dashboard/inventory" && "bg-white border-gray-300 text-black font-medium shadow-sm"
                )}
              >
                <CiSaveUp2 className="h-5 w-5 stroke-gray-800 hover:stroke-black" />
                {expanded && <span className="ml-3 text-sm">Inventory</span>}
              </Link>
              <Link 
                href="/dashboard/users"
                className={cn(
                  "flex items-center w-full p-2 rounded-xl text-gray-800 border-gray-100 hover:bg-white border-[1px] hover:border-gray-300 hover:text-black hover:font-medium hover:shadow-sm",
                  !expanded && "justify-center p-2",
                  pathname === "/dashboard/users" && "bg-white border-gray-300 text-black font-medium shadow-sm"
                )}
              >
                <HiOutlineUsers className="h-5 w-5 stroke-gray-800 hover:stroke-black" />
                {expanded && <span className="ml-3 text-sm">Users</span>}
              </Link>
            </div>
            
          </div>
        </div>
        <div className="mt-auto pt-4">
          <div className="mx-3 py-2 border-t border-gray-200">
            <div className="flex flex-col gap-1">
         
              <Link 
                href="/dashboard/integrations"
                className={cn(
                  "flex items-center w-full p-2 rounded-xl text-gray-800 border-gray-100 hover:bg-white border-[1px] hover:border-gray-300 hover:text-black hover:font-medium hover:shadow-sm",
                  !expanded && "justify-center p-2",
                  pathname === "/dashboard/integrations" && "bg-white border-gray-300 text-black font-medium shadow-sm"
                )}
              >
                <TbPlugConnected className="h-5 w-5 stroke-gray-800 hover:stroke-black" />
                {expanded && <span className="ml-3 text-sm">Integrations</span>}
              </Link>
              <Link 
                href="/dashboard/settings"
                className={cn(
                  "flex items-center w-full p-2 rounded-xl text-gray-800 border-gray-100 hover:bg-white border-[1px] hover:border-gray-300 hover:text-black hover:font-medium hover:shadow-sm",
                  !expanded && "justify-center p-2",
                  pathname === "/dashboard/settings" && "bg-white border-gray-300 text-black font-medium shadow-sm"
                )}
              >
                <MdSettings className="h-5 w-5 stroke-gray-800 hover:stroke-black" />
                {expanded && <span className="ml-3 text-sm">Settings</span>}
              </Link>
              {/* User Profile Section */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-3 mt-4 border-t border-gray-200 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="relative h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt="User avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 text-sm font-medium">
                          {session?.user?.name ? getInitials(session.user.name) : '?'}
                        </span>
                      )}
                    </div>
                    {expanded && (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{session?.user?.name || 'Guest User'}</span>
                        <span className="text-xs text-gray-500">{session?.user?.email || 'No email'}</span>
                      </div>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="flex items-center gap-2 p-2 border-b">
                    <div className="relative h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt="User avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 text-sm font-medium">
                          {session?.user?.name ? getInitials(session.user.name) : '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{session?.user?.name || 'Guest User'}</span>
                      <span className="text-xs text-gray-500">{session?.user?.email || 'No email'}</span>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={handleCancelSubscription} className="cursor-pointer">
                    Cancel Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}