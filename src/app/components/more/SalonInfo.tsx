import { useState } from 'react';
import { ArrowLeft, MapPin, Phone, Clock, Globe, Save, Upload, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

interface SalonInfoProps {
  onBack: () => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const COUNTRIES = [
{ code: 'TR', name: 'Turkey', flag: '🇹🇷', format: '(XXX) XXX XX XX', example: '(5XX) XXX XX XX' },
{ code: 'US', name: 'Amerika', flag: '🇺🇸', format: '(XXX) XXX-XXXX', example: '(XXX) XXX-XXXX' },
{ code: 'GB', name: 'United Kingdom', flag: '🇬🇧', format: 'XXXX XXX XXXX', example: '07XX XXX XXXX' },
{ code: 'DE', name: 'Almanya', flag: '🇩🇪', format: 'XXX XXXXXXXX', example: '1XX XXXXXXXX' }];


interface WorkingHour {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

export function SalonInfo({ onBack }: SalonInfoProps) {
  const [saved, setSaved] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('TR');
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [salonData, setSalonData] = useState({
    name: 'Beauty Workshop',
    phone: '(538) 111 22 33',
    address: 'Nisantasi Mah. Valikonagi Cad. No:42/A, Sisli/Istanbul',
    description: 'In the heart of Nisantasi, we offer professional beauty services with 15 years of experience.',
    mapUrl: 'https://maps.google.com/?q=Nisantasi+Istanbul',
    logoUrl: ''
  });

  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(
    DAYS.map((day, i) => ({
      day,
      open: '09:00',
      close: i === 5 ? '20:00' : '19:00',
      isOpen: i !== 6 // Sunday kapalı
    }))
  );

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateHour = (index: number, field: 'open' | 'close', value: string) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], [field]: value };
    setWorkingHours(updated);
  };

  const toggleDay = (index: number) => {
    const updated = [...workingHours];
    updated[index] = { ...updated[index], isOpen: !updated[index].isOpen };
    setWorkingHours(updated);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Format based on selected country
    if (selectedCountry === 'TR') {
      // Turkish format: (5XX) XXX XX XX
      if (numbers.length <= 3) return `(${numbers}`;
      if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
      if (numbers.length <= 8) return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)} ${numbers.slice(6)}`;
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)} ${numbers.slice(6, 8)} ${numbers.slice(8, 10)}`;
    }

    return numbers;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setSalonData({ ...salonData, phone: formatted });
  };

  const handleAIEnhance = async () => {
    // Simulate AI enhancement
    const enhanced = salonData.description + 'Our expert team offers you a special care experience with state-of-the-art equipment and premium products.';
    setSalonData({ ...salonData, description: enhanced });
  };

  const currentCountry = COUNTRIES.find((c) => c.code === selectedCountry)!;

  return (
    <div className="h-full pb-20 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-[var(--luxury-bg)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Salon Information</h1>
            <p className="text-sm text-muted-foreground">Business details and working hours</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Salon Logo */}
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-4">
            <Label className="mb-3 block">Salon Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[var(--rose-gold)]/20 to-[var(--deep-indigo)]/10 flex items-center justify-center border-2 border-dashed border-border">
                {salonData.logoUrl ?
                <img src={salonData.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-xl" /> :

                <Upload className="w-6 h-6 text-muted-foreground" />
                }
              </div>
              <div className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended size: 512x512px
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">Temel Bilgiler</h3>
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="salon-name">Salon Name</Label>
                <Input
                  id="salon-name"
                  value={salonData.name}
                  onChange={(e) => setSalonData({ ...salonData, name: e.target.value })} />
                
              </div>

              <div className="space-y-2">
                <Label htmlFor="salon-phone">Telefon</Label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCountrySelect(!showCountrySelect)}
                    className="h-10 px-3 rounded-lg border border-input bg-background flex items-center gap-2 text-sm hover:bg-accent transition-colors">
                    
                    <span className="text-lg">{currentCountry.flag}</span>
                    <span className="text-xs text-muted-foreground">+{currentCountry.code === 'TR' ? '90' : currentCountry.code === 'US' ? '1' : currentCountry.code === 'GB' ? '44' : '49'}</span>
                  </button>
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="salon-phone"
                      value={salonData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="pl-10"
                      placeholder={currentCountry.example} />
                    
                  </div>
                </div>
                
                {/* Country Selector Dropdown */}
                {showCountrySelect &&
                <Card className="border-border/50 mt-2">
                    <CardContent className="p-2">
                      {COUNTRIES.map((country) =>
                    <button
                      key={country.code}
                      onClick={() => {
                        setSelectedCountry(country.code);
                        setShowCountrySelect(false);
                        setSalonData({ ...salonData, phone: '' });
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left">
                      
                          <span className="text-xl">{country.flag}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{country.name}</p>
                            <p className="text-xs text-muted-foreground">{country.format}</p>
                          </div>
                        </button>
                    )}
                    </CardContent>
                  </Card>
                }
              </div>

              <div className="space-y-2">
                <Label htmlFor="salon-address">Adres</Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <textarea
                    id="salon-address"
                    value={salonData.address}
                    onChange={(e) => setSalonData({ ...salonData, address: e.target.value })}
                    rows={2}
                    className="w-full bg-transparent rounded-lg px-3 py-2 pl-10 text-sm outline-none border border-input focus:ring-2 focus:ring-[var(--rose-gold)]/30 resize-none" />
                  
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="map-url">Google Maps Business Link</Label>
                <Input
                  id="map-url"
                  value={salonData.mapUrl}
                  onChange={(e) => setSalonData({ ...salonData, mapUrl: e.target.value })}
                  placeholder="https://maps.google.com/..." />
                
                <p className="text-xs text-muted-foreground">
                  Sent to customers as directions in appointment reminders
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salon-desc">Description</Label>
                <textarea
                  id="salon-desc"
                  value={salonData.description}
                  onChange={(e) => setSalonData({ ...salonData, description: e.target.value })}
                  rows={3}
                  className="w-full bg-transparent rounded-lg px-3 py-2 text-sm outline-none border border-input focus:ring-2 focus:ring-[var(--rose-gold)]/30 resize-none" />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIEnhance}
                  className="w-full">
                  
                  <Sparkles className="w-3 h-3 mr-2" />
                  Improve with AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Working Hours */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">Working Hours</h3>
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-2">
              {workingHours.map((wh, index) =>
              <div key={wh.day} className="flex items-center gap-3 py-1">
                  <Switch
                  checked={wh.isOpen}
                  onCheckedChange={() => toggleDay(index)}
                  className="shrink-0" />
                
                  <div className="w-24 shrink-0">
                    <span className={`text-sm ${wh.isOpen ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {wh.day}
                    </span>
                  </div>
                  {wh.isOpen ?
                <div className="flex items-center gap-2 flex-1">
                      <Input
                    type="time"
                    value={wh.open}
                    onChange={(e) => updateHour(index, 'open', e.target.value)}
                    className="h-9 text-sm" />
                  
                      <span className="text-xs text-muted-foreground shrink-0">—</span>
                      <Input
                    type="time"
                    value={wh.close}
                    onChange={(e) => updateHour(index, 'close', e.target.value)}
                    className="h-9 text-sm" />
                  
                    </div> :

                <div className="flex-1">
                      <Badge variant="secondary" className="text-xs text-muted-foreground">Closed</Badge>
                    </div>
                }
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full py-6 rounded-xl shadow-lg"
          style={{ backgroundColor: 'var(--rose-gold)', color: 'white' }}>
          
          <Save className="w-4 h-4 mr-2" />
          {saved ? "Kaydedildi!" : "Değişiklikleri Kaydet"}
        </Button>
      </div>
    </div>);

}