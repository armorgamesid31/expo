import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Banknote, 
  CreditCard, 
  CalendarDays, 
  CircleHelp, 
  CheckCircle2, 
  ChevronRight, 
  Wallet,
  ArrowRight
} from 'lucide-react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerFooter,
  DrawerDescription
} from '../ui/drawer';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
export type CheckoutCloseType = 'SINGLE_PAYMENT' | 'USE_EXISTING_PACKAGE' | 'SELL_NEW_PACKAGE';

interface CheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  totalAmount: number;
  items: Array<{
    key: string;
    serviceName: string;
    price: number;
  }>;
  onConfirm: (paymentMethod: PaymentMethod, closeType: CheckoutCloseType) => void;
  isSubmitting: boolean;
}

export function CheckoutDrawer({
  isOpen,
  onClose,
  customerName,
  totalAmount,
  items,
  onConfirm,
  isSubmitting
}: CheckoutDrawerProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [closeType, setCloseType] = useState<CheckoutCloseType>('SINGLE_PAYMENT');
  const [step, setStep] = useState(1);

  const paymentMethods: Array<{ id: PaymentMethod; label: string; icon: any }> = [
    { id: 'CASH', label: 'Nakit', icon: Banknote },
    { id: 'CARD', label: 'Kart', icon: CreditCard },
    { id: 'TRANSFER', label: 'Havale', icon: Wallet },
    { id: 'OTHER', label: 'Diğer', icon: CircleHelp },
  ];

  const handleConfirm = () => {
    onConfirm(paymentMethod, closeType);
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b border-border pb-4">
          <DrawerTitle className="text-xl font-bold">Ödeme ve Kapatma</DrawerTitle>
          <DrawerDescription>
            {customerName} müşterisi için {items.length} hizmet kapatılıyor.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-6"
              >
                <section>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Ödeme Yöntemi
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                            isSelected 
                              ? 'border-primary bg-primary/5 text-primary' 
                              : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="font-semibold">{method.label}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                    Kapatma Türü
                  </label>
                  <div className="space-y-2">
                    <button
                      onClick={() => setCloseType('SINGLE_PAYMENT')}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        closeType === 'SINGLE_PAYMENT' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5" />
                        <div className="text-left">
                          <p className="font-semibold">Normal Ödeme</p>
                          <p className="text-xs opacity-70">Hizmet bedeli tahsil edilir.</p>
                        </div>
                      </div>
                      {closeType === 'SINGLE_PAYMENT' && <CheckCircle2 className="h-5 w-5" />}
                    </button>
                    
                    <button
                      onClick={() => setCloseType('USE_EXISTING_PACKAGE')}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        closeType === 'USE_EXISTING_PACKAGE' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5" />
                        <div className="text-left">
                          <p className="font-semibold">Paketten Kullan</p>
                          <p className="text-xs opacity-70">Mevcut paketten düşülür.</p>
                        </div>
                      </div>
                      {closeType === 'USE_EXISTING_PACKAGE' && <CheckCircle2 className="h-5 w-5" />}
                    </button>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                  <h4 className="text-sm font-bold mb-3">Hizmet Özet</h4>
                  <ScrollArea className="h-48 pr-4">
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.key} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{item.serviceName}</span>
                          <span className="font-bold">₺{item.price}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-sm font-bold">Toplam Tutar</span>
                    <span className="text-xl font-bold text-primary">₺{totalAmount}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DrawerFooter className="border-t border-border bg-card/50 backdrop-blur-sm">
          <div className="flex gap-3">
            {step === 2 && (
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl h-12"
                onClick={() => setStep(1)}
              >
                Geri
              </Button>
            )}
            <Button 
              className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90 text-white font-bold"
              onClick={step === 1 ? () => setStep(2) : handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'İşleniyor...' : (step === 1 ? 'Özeti Gör' : 'Ödemeyi Tamamla')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
