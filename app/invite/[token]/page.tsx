'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Users, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationData {
  email: string;
  role: string;
  organization: {
    name: string;
    slug: string;
  };
  expiresAt: string;
}

const roleIcons = {
  ADMIN: Shield,
  MEMBER: Users,
  VIEWER: Users,
};

const roleDescriptions = {
  ADMIN: 'Full access to manage team and settings',
  MEMBER: 'Can create and manage vehicles',
  VIEWER: 'Read-only access to view data',
};

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvitation();
  }, [params.token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${params.token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid invitation');
        return;
      }

      setInvitation(data);
    } catch (error) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!session) {
      // Store the invitation URL and redirect to login
      sessionStorage.setItem('pendingInvitation', window.location.pathname);
      router.push('/login');
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${params.token}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to accept invitation',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `You've joined ${data.organization.name}!`,
      });

      // Redirect to the organization's dashboard
      router.push(`/dashboard?org=${data.organization.slug}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const RoleIcon = roleIcons[invitation.role as keyof typeof roleIcons] || Users;
  const isExpired = new Date(invitation.expiresAt) < new Date();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">You're invited to join</p>
            <p className="text-xl font-semibold mt-1">{invitation.organization.name}</p>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <div className="flex items-center gap-2">
                <RoleIcon className="h-4 w-4" />
                <Badge variant="secondary">{invitation.role}</Badge>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {roleDescriptions[invitation.role as keyof typeof roleDescriptions]}
              </p>
            </div>
          </div>

          {isExpired && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              This invitation has expired
            </div>
          )}

          {!session && !isExpired && (
            <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg">
              Please log in to accept this invitation
            </div>
          )}

          {session && session.user?.email !== invitation.email && !isExpired && (
            <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg">
              This invitation is for {invitation.email}. You're logged in as {session.user.email}.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!isExpired && (
            <>
              {!session ? (
                <Button onClick={handleAccept} className="w-full">
                  Log in to Accept
                </Button>
              ) : session.user?.email === invitation.email ? (
                <Button 
                  onClick={handleAccept} 
                  className="w-full" 
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    'Accept Invitation'
                  )}
                </Button>
              ) : (
                <Button disabled className="w-full">
                  Wrong Account
                </Button>
              )}
            </>
          )}
          <Button 
            variant="outline" 
            onClick={() => router.push(session ? '/dashboard' : '/')} 
            className="w-full"
          >
            {isExpired ? 'Go to Dashboard' : 'Decline'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}