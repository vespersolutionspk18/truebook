'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      toast({
        title: 'Success',
        description: 'Successfully connected to Monroney Labels.',
        variant: 'default',
      });
      router.replace('/dashboard/integrations');
    } else if (error) {
      const errorMessages = {
        oauth_denied: 'Authorization was denied.',
        no_code: 'No authorization code received.',
        no_verifier: 'Authentication verification failed.',
        token_exchange: 'Failed to complete authentication.',
        unknown: 'An unknown error occurred.',
      };

      toast({
        title: 'Error',
        description: errorMessages[error as keyof typeof errorMessages] || 'Failed to connect to Monroney Labels.',
        variant: 'destructive',
      });
      router.replace('/dashboard/integrations');
    }
  }, [searchParams, toast, router]);

  const handleMonroneyLogin = async () => {
    try {
      setIsLoading(true);
      // Get the PKCE challenge and verifier from the backend
      const response = await fetch('/api/integrations/monroney/init', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to initialize OAuth flow');
      }

      const { authUrl } = await response.json();
      
      // Redirect to Monroney's OAuth page
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initializing Monroney OAuth:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect to Monroney Labels. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-h-screen overflow-y-auto scrollbar-hide">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Truebook</Link>
        <span>/</span>
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span>/</span>
        <span className="text-foreground">Integrations</span>
      </nav>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Integrations</h2>
        <p className="text-sm text-muted-foreground">Connect your account with external services.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monroney Labels</CardTitle>
            <CardDescription>
              Connect to the Monroney Labels service to access and manage vehicle window stickers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleMonroneyLogin}
                disabled={isLoading}
              >
                {isLoading ? 'Connecting...' : 'Connect to Monroney Labels'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 