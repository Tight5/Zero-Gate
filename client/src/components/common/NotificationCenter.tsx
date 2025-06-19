import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ open, onClose }) => {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Stay updated with your latest activities
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">
            No new notifications
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;