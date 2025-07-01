'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const getInitials = (name: string = '') => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  createdAt: string;
  emailVerified: string | null;
  settings?: {
    notifications: boolean;
    emailUpdates: boolean;
    darkMode: boolean;
  };
}

export default function UserDetailPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [emailVerified, setEmailVerified] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;
      
      try {
        setIsLoadingUser(true);
        
        // Load the target user
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: 'Error',
              description: 'User not found',
              variant: 'destructive',
            });
            router.push('/dashboard/users');
            return;
          }
          throw new Error('Failed to load user');
        }
        const user = await response.json();
        setUserData(user);
        setNotifications(user.settings?.notifications ?? true);
        setEmailUpdates(user.settings?.emailUpdates ?? true);
        setDarkMode(user.settings?.darkMode ?? false);
        setName(user.name || '');
        setEmail(user.email || '');
        setRole(user.role);
        setEmailVerified(!!user.emailVerified);
        if (user.image) {
          setAvatarPreview(user.image);
        }

        // Load current user's role for permissions
        const currentUserResponse = await fetch('/api/user/settings');
        if (currentUserResponse.ok) {
          const currentUserData = await currentUserResponse.json();
          // We need to get the role from the users API since settings doesn't include role
          const currentUserEmail = session?.user?.email;
          if (currentUserEmail) {
            const usersResponse = await fetch('/api/users');
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              const currentUser = users.find((u: any) => u.email === currentUserEmail);
              setCurrentUserRole(currentUser?.role || null);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, [userId, toast, router, session]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'Error',
          description: 'Image size should be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAvatarFile(file);
    }
  };

  const handleSaveUserInfo = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      
      // Only include role if current user has permission to modify it
      if (currentUserRole === 'SUPERADMIN' || currentUserRole === 'ADMIN') {
        formData.append('role', role);
      }
      
      formData.append('notifications', notifications.toString());
      formData.append('emailUpdates', emailUpdates.toString());
      formData.append('darkMode', darkMode.toString());
      formData.append('emailVerified', emailVerified.toString());
      
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        body: formData
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save user information');
      }
  
      // Clear the avatar file after successful upload
      setAvatarFile(null);
      
      toast({
        title: "Success",
        description: "User information saved successfully",
      });
    } catch (error) {
      console.error('Error saving user information:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save user information',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return;
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setPasswordError('');
    try {
      const response = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
        })
      });
    
      if (!response.ok) {
        const data = await response.json();
        setPasswordError(data.error || 'Failed to update password');
        throw new Error(data.error || 'Failed to update password');
      }
    
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      
      // Clear password fields after successful save
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update password',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      });

      router.push('/dashboard/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="space-y-6 max-h-screen overflow-y-auto scrollbar-hide">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900">Truebook</Link>
          <span className="text-gray-400">/</span>
          <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
          <span className="text-gray-400">/</span>
          <Link href="/dashboard/users" className="hover:text-gray-900">Users</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">Loading...</span>
        </nav>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading user...</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="space-y-6 max-h-screen overflow-y-auto scrollbar-hide">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-gray-900">Truebook</Link>
          <span className="text-gray-400">/</span>
          <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
          <span className="text-gray-400">/</span>
          <Link href="/dashboard/users" className="hover:text-gray-900">Users</Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">User Not Found</span>
        </nav>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto scrollbar-hide">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-900">Truebook</Link>
        <span className="text-gray-400">/</span>
        <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
        <span className="text-gray-400">/</span>
        <Link href="/dashboard/users" className="hover:text-gray-900">Users</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900">{userData.name || userData.email || 'User'}</span>
      </nav>

      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">User Details</h2>
          <p className="text-sm text-muted-foreground">Manage user account and preferences.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl text-gray-400">
                        {name ? getInitials(name) : '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                      Choose Image
                    </div>
                    <input
                      type="file"
                      id="avatar"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max size 5MB.</p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  placeholder="User name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="User email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {(currentUserRole === 'SUPERADMIN' || currentUserRole === 'ADMIN') && (
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(value: 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE') => setRole(value)}>
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
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Verified</Label>
                  <p className="text-sm text-muted-foreground">Mark email as verified</p>
                </div>
                <Switch
                  checked={emailVerified}
                  onCheckedChange={setEmailVerified}
                />
              </div>
              <Button 
                onClick={() => handleSaveUserInfo()} 
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Account Info'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-500 mt-2">{passwordError}</p>
              )}
              <Button 
                onClick={() => handleUpdatePassword()} 
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications about updates and activity.</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Updates</Label>
                <p className="text-sm text-muted-foreground">Receive email updates about account activity.</p>
              </div>
              <Switch
                checked={emailUpdates}
                onCheckedChange={setEmailUpdates}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle dark mode for the application interface.</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(userData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Role</span>
                  <Badge variant={
                    userData.role === 'SUPERADMIN' ? "default" :
                    userData.role === 'ADMIN' ? "destructive" :
                    userData.role === 'MANAGER' ? "secondary" :
                    "outline"
                  }>
                    {userData.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Email Status</span>
                  <Badge variant={emailVerified ? "default" : "destructive"}>
                    {emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notifications</span>
                  <Badge variant={notifications ? "default" : "secondary"}>
                    {notifications ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Permanently delete this user and all associated data.</p>
                <Button variant="destructive" onClick={handleDeleteUser} disabled={isLoading}>
                  {isLoading ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}