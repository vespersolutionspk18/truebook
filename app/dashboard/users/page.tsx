'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  createdAt: Date;
  emailVerified: Date | null;
  settings?: {
    notifications: boolean;
    emailUpdates: boolean;
    darkMode: boolean;
  };
}

const ITEMS_PER_PAGE = 20;

export default function UsersPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("EMPLOYEE");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('');
  const [selectedNotificationStatus, setSelectedNotificationStatus] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await fetch('/api/users', {
          credentials: 'include'
        });
        if (!response.ok) {
          console.error('HTTP Error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error(`Failed to fetch users: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        console.error('Full error details:', error);
        setUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Apply verification status filter
      if (selectedVerificationStatus && selectedVerificationStatus !== 'all') {
        const isVerified = !!user.emailVerified;
        if (selectedVerificationStatus === 'verified' && !isVerified) return false;
        if (selectedVerificationStatus === 'unverified' && isVerified) return false;
      }

      // Apply notification status filter
      if (selectedNotificationStatus && selectedNotificationStatus !== 'all') {
        const hasNotifications = user.settings?.notifications ?? true;
        if (selectedNotificationStatus === 'enabled' && !hasNotifications) return false;
        if (selectedNotificationStatus === 'disabled' && hasNotifications) return false;
      }

      // Apply role filter
      if (selectedRole && selectedRole !== 'all') {
        if (user.role !== selectedRole) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  const handleRowClick = (userId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-cell')) {
      return;
    }
    router.push(`/dashboard/users/${userId}`);
  };

  const handleCheckboxChange = (userId: string, checked: boolean) => {
    setSelectedUsers((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (checked) {
        newSelected.add(userId);
      } else {
        newSelected.delete(userId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(new Set(checked ? currentUsers.map((u) => u.id) : []));
  };

  const handleAddNew = () => {
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!newEmail || !newName || !newPassword) return;
  
    setIsLoading(true);
    try {
      const createUserResponse = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole
        })
      });
  
      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        if (createUserResponse.status === 409) {
          throw new Error('A user with this email already exists');
        } else if (createUserResponse.status === 401) {
          throw new Error('You must be logged in to create users');
        } else if (createUserResponse.status === 400) {
          throw new Error('Invalid user data. Please check the fields and try again');
        }
        throw new Error(errorData.message || 'Failed to create user');
      }
  
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('EMPLOYEE');
      setIsDialogOpen(false);
      
      // Refresh users list
      const response = await fetch('/api/users');
      if (response.ok) {
        const updatedUsers = await response.json();
        setUsers(updatedUsers);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedUsers.size === 0) return;

    try {
      const deletePromises = Array.from(selectedUsers).map(id =>
        fetch(`/api/users/${id}`, {
          method: 'DELETE',
        })
      );

      await Promise.all(deletePromises);
      
      // Fetch updated users list
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to refresh users list');
      }
      const updatedUsers = await response.json();
      
      setUsers(updatedUsers);
      setSelectedUsers(new Set());
      setCurrentPage(1); // Reset to first page after deletion
    } catch (error) {
      console.error('Error deleting users:', error);
      alert('Failed to delete one or more users');
    }
  };

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">View and manage system users</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDeleteSelected}
            variant="destructive"
            disabled={selectedUsers.size === 0}
            size="sm"
          >
            Delete Selected
          </Button>
          <Button onClick={handleAddNew} variant="default" size="sm">
            Add New
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortOrder('desc')}>
              Newest First
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortOrder('asc')}>
              Oldest First
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(prev => !prev)}
        >
          <Filter className="h-4 w-4" />
        </Button>

        <div
          className={cn(
            "flex gap-4 items-center transition-all duration-300",
            showFilters ? "opacity-100" : "opacity-0 hidden"
          )}
        >
          <div className="flex items-center gap-2">
            <Select value={selectedVerificationStatus} onValueChange={setSelectedVerificationStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            {selectedVerificationStatus && selectedVerificationStatus !== 'all' && (
              <button
                onClick={() => setSelectedVerificationStatus('all')}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedNotificationStatus} onValueChange={setSelectedNotificationStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by notifications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="enabled">Notifications enabled</SelectItem>
                <SelectItem value="disabled">Notifications disabled</SelectItem>
              </SelectContent>
            </Select>
            {selectedNotificationStatus && selectedNotificationStatus !== 'all' && (
              <button
                onClick={() => setSelectedNotificationStatus('all')}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
              </SelectContent>
            </Select>
            {selectedRole && selectedRole !== 'all' && (
              <button
                onClick={() => setSelectedRole('all')}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <span className="text-2xl leading-none font-medium text-gray-500 hover:text-gray-700">×</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent h-9 bg-gray-100">
              <TableHead className="w-[40px] p-0">
                <div className="h-9 flex items-center justify-center">
                  <Checkbox
                    checked={currentUsers.length > 0 && currentUsers.every(user => selectedUsers.has(user.id))}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  />
                </div>
              </TableHead>
              <TableHead className="w-[60px] font-medium">Avatar</TableHead>
              <TableHead className="w-[200px] font-medium">Name</TableHead>
              <TableHead className="w-[250px] font-medium">Email</TableHead>
              <TableHead className="w-[120px] font-medium">Role</TableHead>
              <TableHead className="w-[120px] font-medium">Verified</TableHead>
              <TableHead className="w-[120px] font-medium">Notifications</TableHead>
              <TableHead className="w-[100px] font-medium">Dark Mode</TableHead>
              <TableHead className="w-[150px] font-medium">Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              <TableRow key="loading">
                <TableCell colSpan={9} className="text-center py-4">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow key="no-users">
                <TableCell colSpan={9} className="text-center py-4">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              currentUsers.map((user, index) => (
                <TableRow 
                  key={user.id || `user-${index}`}
                  onClick={(e) => handleRowClick(user.id, e)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors h-9 whitespace-nowrap"
                >
                  <TableCell className="p-0">
                    <div className="checkbox-cell h-9 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(user.id, !!checked)}
                        className="cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="py-1">
                    <div className="relative h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt="User avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 text-xs font-medium">
                          {user.name ? getInitials(user.name) : '?'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-1 font-medium truncate max-w-[200px]">
                    {user.name || 'No name'}
                  </TableCell>
                  <TableCell className="py-1 truncate max-w-[250px]">
                    {user.email || 'No email'}
                  </TableCell>
                  <TableCell className="py-1 truncate max-w-[120px]">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      user.role === 'SUPERADMIN' ? "bg-purple-100 text-purple-800" :
                      user.role === 'ADMIN' ? "bg-red-100 text-red-800" :
                      user.role === 'MANAGER' ? "bg-orange-100 text-orange-800" :
                      "bg-green-100 text-green-800"
                    )}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 truncate max-w-[120px]">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      user.emailVerified 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    )}>
                      {user.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 truncate max-w-[120px]">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      (user.settings?.notifications ?? true)
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {(user.settings?.notifications ?? true) ? 'Enabled' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 truncate max-w-[100px]">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      (user.settings?.darkMode ?? false)
                        ? "bg-gray-800 text-gray-100" 
                        : "bg-gray-100 text-gray-800"
                    )}>
                      {(user.settings?.darkMode ?? false) ? 'Dark' : 'Light'}
                    </span>
                  </TableCell>
                  <TableCell className="py-1 truncate max-w-[150px]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem key="pagination-prev">
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <PaginationItem key={`pagination-page-${page}`}> 
                    <PaginationLink 
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem key="pagination-next">
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Enter email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Input
                placeholder="Enter password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Select value={newRole} onValueChange={setNewRole} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSave}
              disabled={!newEmail || !newName || !newPassword || isLoading}
              className="w-full"
            >
              {isLoading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}