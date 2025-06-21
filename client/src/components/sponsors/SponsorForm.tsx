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

  // Handle tag management
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      form.setValue('tags', updatedTags);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    form.setValue('tags', updatedTags);
  };

  const createMutation = useMutation({
    mutationFn: async (data: SponsorFormData) => {
      const { email, phone, tags: formTags, ...sponsorData } = data;
      const contactInfo: any = {};
      if (email) contactInfo.email = email;
      if (phone) contactInfo.phone = phone;

      const payload = {
        ...sponsorData,
        contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : {},
        tags: formTags || [],
        tenantId, // Add tenant ID to payload
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
        {/* Real-time validation feedback */}
        {form.formState.errors && Object.keys(form.formState.errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the validation errors below before submitting.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Sponsor Name *
                  {form.formState.errors.name ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : field.value && field.value.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Tech Foundation" 
                    {...field}
                    className={form.formState.errors.name ? "border-destructive" : ""}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Enter the full legal name of the sponsor organization
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Organization *
                  {form.formState.errors.organization ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : field.value && field.value.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., XYZ Foundation Inc." 
                    {...field}
                    className={form.formState.errors.organization ? "border-destructive" : ""}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Parent organization or department name
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>
                  Select the primary organizational category
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Domain
                  {form.formState.errors.domain ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : field.value && field.value.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., example.org" 
                    {...field}
                    className={form.formState.errors.domain ? "border-destructive" : ""}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Organization's primary website domain
                </FormDescription>
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
                <FormLabel className="flex items-center gap-2">
                  Email
                  {form.formState.errors.email ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : field.value && field.value.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="contact@example.com" 
                    {...field}
                    className={form.formState.errors.email ? "border-destructive" : ""}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Primary contact email for this sponsor
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Phone
                  {form.formState.errors.phone ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : field.value && field.value.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="+1 (555) 123-4567" 
                    {...field}
                    className={form.formState.errors.phone ? "border-destructive" : ""}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Primary contact phone number
                </FormDescription>
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
                <FormLabel className="flex items-center gap-2">
                  Relationship Manager
                  {form.formState.errors.relationshipManager ? (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  ) : field.value && field.value.length > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : null}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="John Doe" 
                    {...field}
                    className={form.formState.errors.relationshipManager ? "border-destructive" : ""}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Primary relationship manager for this sponsor
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="relationshipStrength"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship Strength *</FormLabel>
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
                    <SelectItem value="1">1 - Initial Contact</SelectItem>
                    <SelectItem value="2">2 - Limited Interaction</SelectItem>
                    <SelectItem value="3">3 - Regular Communication</SelectItem>
                    <SelectItem value="4">4 - Strong Partnership</SelectItem>
                    <SelectItem value="5">5 - Strategic Alliance</SelectItem>
                    <SelectItem value="6">6 - Close Partnership</SelectItem>
                    <SelectItem value="7">7 - Trusted Advisor</SelectItem>
                    <SelectItem value="8">8 - Key Stakeholder</SelectItem>
                    <SelectItem value="9">9 - Strategic Partner</SelectItem>
                    <SelectItem value="10">10 - Essential Partnership</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>
                  Rate the relationship strength from 1-10
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        {/* Enhanced Tags Management Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Tags</Label>
            <FormDescription className="text-xs text-muted-foreground mb-2">
              Add relevant tags to categorize this sponsor
            </FormDescription>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={!newTag.trim() || tags.includes(newTag.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                Notes
                {form.formState.errors.notes ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : field.value && field.value.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : null}
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes about this sponsor (strategic insights, communication preferences, etc.)"
                  className={`min-h-[100px] ${form.formState.errors.notes ? "border-destructive" : ""}`}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                {field.value ? `${field.value.length}/5000 characters` : "0/5000 characters"}
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Form Summary and Validation Status */}
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            Form Status
            {form.formState.isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
          </h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Required fields completed:</span>
              <span className={form.formState.isValid ? "text-green-600" : "text-orange-500"}>
                {form.formState.isValid ? "✓ Complete" : "○ Incomplete"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Validation errors:</span>
              <span className={Object.keys(form.formState.errors).length === 0 ? "text-green-600" : "text-red-600"}>
                {Object.keys(form.formState.errors).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tags added:</span>
              <span className="text-muted-foreground">{tags.length}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-primary hover:bg-primary/90"
            disabled={createMutation.isPending || !form.formState.isValid}
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
