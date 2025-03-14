
import React from 'react';
import { DeliveryStop } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TimePicker } from '@/components/ui/time-picker';
import { AlertCircle, Copy, Trash2 } from 'lucide-react';

interface StopFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  stop: Partial<DeliveryStop> | null;
  currentDateString: string;
  isEdit: boolean;
  onSubmit: () => void;
  onDelete?: (stopId: string) => void;
  onDuplicate?: (stopId: string) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onTimeChange: (time: string) => void;
}

const StopFormModal: React.FC<StopFormModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  stop,
  currentDateString,
  isEdit,
  onSubmit,
  onDelete,
  onDuplicate,
  onInputChange,
  onSelectChange,
  onTimeChange
}) => {
  const submitButtonText = isEdit ? 'Update Stop' : 'Add Stop';
  const isFormValid = stop?.businessName && stop?.address && 
                      stop?.deliveryTime && stop?.stopType && stop?.deliveryDate;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-600">{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        {stop && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder="Enter business name"
                value={stop.businessName || ''}
                onChange={onInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input
                id="clientName"
                name="clientName"
                placeholder="Enter client name"
                value={stop.clientName || ''}
                onChange={onInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
              <Input
                id="address"
                name="address"
                placeholder="Enter delivery address"
                value={stop.address || ''}
                onChange={onInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone Number (Optional)</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                placeholder="Enter contact phone number"
                value={stop.contactPhone || ''}
                onChange={onInputChange}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date <span className="text-red-500">*</span></Label>
                <Input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  value={stop.deliveryDate || ''}
                  onChange={onInputChange}
                  required
                />
                {isEdit && stop.deliveryDate !== currentDateString && (
                  <p className="text-xs text-yellow-600 mt-1">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    This date differs from the current view date ({currentDateString})
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deliveryTime">Delivery Time <span className="text-red-500">*</span></Label>
                <TimePicker
                  value={stop.deliveryTime || ''}
                  onValueChange={(time) => onTimeChange(time)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stopType">Stop Type <span className="text-red-500">*</span></Label>
              <Select
                value={stop.stopType}
                onValueChange={(value) => onSelectChange('stopType', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
              <Textarea
                id="specialInstructions"
                name="specialInstructions"
                placeholder="Enter any special instructions"
                value={stop.specialInstructions || ''}
                onChange={onInputChange}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}
        <DialogFooter className={`mt-4 ${isEdit ? 'flex flex-col sm:flex-row justify-between' : ''}`}>
          {isEdit && onDelete && onDuplicate && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mb-2 sm:mb-0">
              <Button 
                variant="destructive"
                onClick={() => onDelete(stop?.id || '')}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (stop?.id) {
                    onDuplicate(stop.id);
                    onOpenChange(false);
                  }
                }}
                className="w-full sm:w-auto"
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={onSubmit} 
              disabled={!isFormValid}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {submitButtonText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StopFormModal;
