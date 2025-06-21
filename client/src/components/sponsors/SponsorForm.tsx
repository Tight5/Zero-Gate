import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { sponsorFormSchema, type SponsorFormData } from "@/lib/validation";
import { useState } from "react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SponsorFormProps {
  sponsor?: any;
  onSuccess: () => void;
  tenantId: string;
}

export default function SponsorForm({ sponsor, onSuccess, tenantId }: SponsorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<string[]>(sponsor?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const form = useForm<SponsorFormData>({
    resolver: zodResolver(sponsorFormSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: sponsor?.name || "",
      organization: sponsor?.organization || "",
      type: sponsor?.type || "foundation",
      relationshipManager: sponsor?.relationshipManager || "",
      relationshipStrength: sponsor?.relationshipStrength || 5,
      notes: sponsor?.notes || "",
      email: sponsor?.contactInfo?.email || "",
      phone: sponsor?.contactInfo?.phone || "",
      tags: sponsor?.tags || [],
    },
  });

  const watchedValues = form.watch();

  const createMutation = useMutation({
    mutationFn: async (data: SponsorFormData) => {
      const { email, phone, ...sponsorData } = data;
      const contactInfo: any = {};
      if (email) contactInfo.email = email;
      if (phone) contactInfo.phone = phone;

      const payload = {
        ...sponsorData,
        contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : {},
        tags: [],
      };

      if (sponsor) {
        await apiRequest("PUT", `/api/sponsors/${sponsor.id}`, payload);
      } else {
        await apiRequest("POST", "/api/sponsors", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors"] });
      toast({
        title: "Success",
        description: `Sponsor ${sponsor ? "updated" : "created"} successfully`,
      });
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: `Failed to ${sponsor ? "update" : "create"} sponsor`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SponsorFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sponsor Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Tech Foundation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="nonprofit">Non-Profit</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="relationshipManager"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship Manager</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="relationshipStrength"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship Strength</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select strength" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 - Weak</SelectItem>
                    <SelectItem value="2">2 - Limited</SelectItem>
                    <SelectItem value="3">3 - Moderate</SelectItem>
                    <SelectItem value="4">4 - Strong</SelectItem>
                    <SelectItem value="5">5 - Very Strong</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes about this sponsor..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-primary hover:bg-primary/90"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending 
              ? (sponsor ? "Updating..." : "Creating...") 
              : (sponsor ? "Update Sponsor" : "Create Sponsor")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
