'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/contexts/organization-context';

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false);
  const { currentOrganization, organizations, switchOrganization, isLoading } = useOrganization();

  const handleSelect = async (orgId: string) => {
    if (orgId !== currentOrganization?.id) {
      await switchOrganization(orgId);
    }
    setOpen(false);
  };

  if (!currentOrganization || !organizations || organizations.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[240px] justify-between"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{currentOrganization.name}</span>
          </div>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {organizations && organizations.length > 0 ? (
                organizations.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.name}
                  onSelect={() => handleSelect(org.id)}
                >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentOrganization.id === org.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{org.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {org.role}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {org.plan}
                    </Badge>
                  </div>
                </div>
              </CommandItem>
            ))
          ) : null}
          </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}